import type { WorkspaceModel } from '@turbo-console/core';

import { PredictionBatches } from './prediction-batches.ts';
import { PredictionLaunch } from './prediction-launch.ts';
import { PredictionWaits } from './prediction-waits.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { PredictionEntry, PredictionTicket } from '../common/prediction-batch.type.ts';
import type { PredictionLoadPorts, PredictionLookup, PredictionView } from '../common/prediction.type.ts';
import { predictionKeyOf } from '../utils/prediction-key.util.ts';

const hasPackage = (model: WorkspaceModel | null, packageName: string): boolean => {
  const packages = model?.packages ?? [];

  return packages.some((pkg) => pkg.name === packageName);
};

const hasView = (entry: PredictionEntry): boolean => entry.view !== null;

/**
 * The cache prediction of each package, one entry per `(root, packageName)`. No entry is Absent; a ticket that is not
 * live is Queued, a live one Loading; no ticket and a view is Loaded, none and no view Failed. Queued and Loading keep
 * the last view until the new answer settles. Only `packageShown` creates an entry, and it ignores any package that has
 * one, so a Failed package is not asked again by a tree that redraws on every change.
 */
export class PredictionLoads {
  public readonly view: PredictionLookup;
  private readonly ports: PredictionLoadPorts;
  private readonly batches: PredictionBatches;
  private readonly launcher: PredictionLaunch;
  private readonly entries = new Map<string, PredictionEntry>();
  private readonly waits = new PredictionWaits();
  private shown = false;
  private disposed = false;

  public constructor(ports: PredictionLoadPorts) {
    const send = (ticket: PredictionTicket): void => {
      this.launcher.launch(ticket);
    };
    const view = (root: string, packageName: string): PredictionView | null => {
      const entry = this.entries.get(predictionKeyOf(root, packageName));

      return entry?.view ?? null;
    };

    this.ports = ports;
    this.view = view;
    this.batches = new PredictionBatches(ports, send);
    this.launcher = new PredictionLaunch(ports, this.entries, this.batches, this.waits);
  }

  public packageShown(root: string, packageName: string): void {
    const isKnown = this.entries.has(predictionKeyOf(root, packageName));

    if (!this.shown || isKnown) return;

    const binary = this.ports.binaryOf(root);
    const hasBinary = binary !== null;

    if (hasBinary) this.queue(root, packageName, null);
    else this.waits.add(root, packageName);
  }

  /** Off drops every timer and aborts every run, so nothing due is sent; consumers follow the toggle's own event. */
  public toggled(shown: boolean): void {
    if (shown === this.shown || this.disposed) return;

    this.shown = shown;

    if (shown) return;

    this.batches.clear();
    this.entries.clear();
    this.waits.clear();
  }

  public runEnded(root: string): void {
    this.requeue(this.restartableOf(root));
  }

  public refreshAll(): void {
    this.requeue(this.restartable());
  }

  /** A package still in the new model asks again; one gone is dropped. The packages waiting for a binary retry in any case. */
  public modelChanged(change: RootChange): void {
    const { root, before, after } = change;

    if (after !== before) this.reconcile(root, after);

    const waiting = this.waits.takeOf(root, after);

    for (const packageName of waiting) this.packageShown(root, packageName);
  }

  /** A removed root keeps nothing: its runs abort and nothing is announced. */
  public rootsKept(kept: ReadonlySet<string>): void {
    for (const entry of this.snapshot()) {
      const isKept = kept.has(entry.root);

      if (isKept) continue;

      this.batches.dropRoot(entry.root);
      this.entries.delete(predictionKeyOf(entry.root, entry.packageName));
    }

    this.waits.keep(kept);
  }

  public dispose(): void {
    this.shown = false;
    this.disposed = true;
    this.batches.clear();
    this.entries.clear();
    this.waits.clear();
  }

  private queue(root: string, packageName: string, view: PredictionView | null): void {
    const ticket = this.batches.join(root, packageName);

    this.entries.set(predictionKeyOf(root, packageName), { root, packageName, view, ticket });
  }

  private snapshot(): PredictionEntry[] {
    const values = this.entries.values();

    return [...values];
  }

  /** Loading, Loaded and Failed entries; a Queued one is already on its way. */
  private restartable(): PredictionEntry[] {
    const isRestartable = (entry: PredictionEntry): boolean => entry.ticket === null || this.batches.isLive(entry.ticket);

    return this.snapshot().filter(isRestartable);
  }

  private restartableOf(root: string): PredictionEntry[] {
    const isOfRoot = (entry: PredictionEntry): boolean => entry.root === root;

    return this.restartable().filter(isOfRoot);
  }

  /** Joins the new tickets first and leaves the old ones last, so an emptied live run hands the slot to a batch that already holds them. */
  private requeue(restarted: PredictionEntry[]): void {
    for (const entry of restarted) this.queue(entry.root, entry.packageName, entry.view);

    for (const entry of restarted) this.leave(entry);
  }

  private leave(entry: PredictionEntry): void {
    if (entry.ticket !== null) this.batches.leave(entry.ticket, entry.packageName);
  }

  private reconcile(root: string, after: WorkspaceModel | null): void {
    const own = this.restartableOf(root);
    const isKept = (entry: PredictionEntry): boolean => hasPackage(after, entry.packageName);
    const isGone = (entry: PredictionEntry): boolean => !isKept(entry);
    const gone = own.filter(isGone);
    const hadView = gone.some(hasView);

    this.requeue(own.filter(isKept));

    for (const entry of gone) {
      this.leave(entry);
      this.entries.delete(predictionKeyOf(root, entry.packageName));
    }

    if (hadView) this.ports.changed(root);
  }
}
