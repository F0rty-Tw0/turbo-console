import type { DryRunState, WorkspaceModel } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type {
  PredictionBatch,
  PredictionBatchPort,
  PredictionEntry,
  PredictionLoadPorts,
  PredictionTicket,
  PredictionView,
  PredictionWaitPort
} from '../common/prediction.type.ts';
import { hasPackageNamed } from '../utils/package-named.util.ts';
import { predictionKeyOf } from '../utils/prediction-key.util.ts';
import { predictionBatchOf } from '../utils/prediction-request.util.ts';
import { predictionTasksOf } from '../utils/prediction-tasks.util.ts';

const nameOf = (entry: PredictionEntry): string => entry.packageName;

/**
 * Spawns the dry run of a live ticket and writes its outcome into `entries`, which `PredictionLoads` shares. A result
 * stores only into the entries that still point at its ticket, so an aborted, replaced or dropped run changes nothing.
 */
export class PredictionLaunch {
  private readonly ports: PredictionLoadPorts;
  private readonly entries: Map<string, PredictionEntry>;
  private readonly batches: PredictionBatchPort;
  private readonly waits: PredictionWaitPort;

  public constructor(
    ports: PredictionLoadPorts,
    entries: Map<string, PredictionEntry>,
    batches: PredictionBatchPort,
    waits: PredictionWaitPort
  ) {
    this.ports = ports;
    this.entries = entries;
    this.batches = batches;
    this.waits = waits;
  }

  public launch(ticket: PredictionTicket): void {
    const { root, members } = ticket;
    const packages = [...members];
    const binary = this.ports.binaryOf(root);
    const model = this.ports.modelOf(root);

    for (const packageName of packages) this.point(root, packageName, ticket);

    if (binary === null || model === null) {
      this.park(ticket, packages);

      return;
    }

    const batch = predictionBatchOf(model, packages);

    this.settleUnasked(ticket, packages, model, batch);

    if (batch === null) {
      this.batches.finished(ticket);

      return;
    }

    const onOk = (states: DryRunState[]): void => {
      this.settled(ticket, batch, states);
    };
    const onFail = (error: unknown): void => {
      this.failed(ticket, error);
    };
    const run = this.ports.dryRun(binary, batch.request, ticket.controller.signal);

    void run.then(onOk, onFail);
  }

  private point(root: string, packageName: string, ticket: PredictionTicket): void {
    const key = predictionKeyOf(root, packageName);
    const entry = this.entries.get(key);

    if (entry !== undefined) this.entries.set(key, { ...entry, ticket });
  }

  /** No binary or no model at the send: the packages wait for the root's next model, like a package shown too early. */
  private park(ticket: PredictionTicket, packages: string[]): void {
    const hadView = this.forget(ticket.root, packages);

    for (const packageName of packages) this.waits.add(ticket.root, packageName);

    this.batches.finished(ticket);

    if (hadView) this.ports.changed(ticket.root, new Set(packages));
  }

  /**
   * A package the batch does not ask for leaves the ticket. One the model no longer holds is Absent, so a later show
   * asks again; one with no requested task is Loaded with an empty answer at once.
   */
  private settleUnasked(ticket: PredictionTicket, packages: string[], model: WorkspaceModel, batch: PredictionBatch | null): void {
    const asked = new Set(batch?.request.packages ?? []);
    const isUnasked = (packageName: string): boolean => !asked.has(packageName);
    const isGone = (packageName: string): boolean => !hasPackageNamed(model, packageName);
    const isHeld = (packageName: string): boolean => !isGone(packageName);
    const unasked = packages.filter(isUnasked);
    const gone = unasked.filter(isGone);
    const empty = unasked.filter(isHeld);
    const hadView = this.drop(ticket, gone);

    this.storeEmpty(ticket, empty);

    const announced = new Set([...gone, ...empty]);

    if (hadView || empty.length > 0) this.ports.changed(ticket.root, announced);
  }

  /** Forgets `gone`, which leave the ticket, and says whether any of them had an answer to take back. */
  private drop(ticket: PredictionTicket, gone: string[]): boolean {
    const hadView = this.forget(ticket.root, gone);

    for (const packageName of gone) this.batches.leave(ticket, packageName);

    return hadView;
  }

  /** Deletes the entries of `packages` and says whether any of them had an answer to take back. */
  private forget(root: string, packages: string[]): boolean {
    let hadView = false;

    for (const packageName of packages) {
      const key = predictionKeyOf(root, packageName);
      const view = this.entries.get(key)?.view ?? null;

      hadView ||= view !== null;
      this.entries.delete(key);
    }

    return hadView;
  }

  private storeEmpty(ticket: PredictionTicket, empty: string[]): void {
    const view: PredictionView = { settledAt: this.ports.now(), tasks: new Map() };

    for (const packageName of empty) {
      this.entries.set(predictionKeyOf(ticket.root, packageName), { root: ticket.root, packageName, view, ticket: null });
      this.batches.leave(ticket, packageName);
    }
  }

  private settled(ticket: PredictionTicket, batch: PredictionBatch, states: DryRunState[]): void {
    const tasks = predictionTasksOf(states, batch.requested);
    const mine = this.entriesOf(ticket);
    const settledAt = this.ports.now();

    for (const { root, packageName } of mine) {
      const view: PredictionView = { settledAt, tasks: tasks.get(packageName) ?? new Map() };

      this.entries.set(predictionKeyOf(root, packageName), { root, packageName, view, ticket: null });
    }

    const names = mine.map(nameOf);

    if (mine.length > 0) this.ports.changed(ticket.root, new Set(names));

    this.batches.finished(ticket);
  }

  /** An abort is not a failure: only entries that still wait on the ticket fail, with one line for the whole run. */
  private failed(ticket: PredictionTicket, error: unknown): void {
    const mine = this.entriesOf(ticket);
    const isStale = ticket.controller.signal.aborted || mine.length === 0;

    if (!isStale) this.fail(ticket, mine, error);

    this.batches.finished(ticket);
  }

  private fail(ticket: PredictionTicket, mine: PredictionEntry[], error: unknown): void {
    const names = mine.map(nameOf);

    for (const { root, packageName } of mine) {
      this.entries.set(predictionKeyOf(root, packageName), { root, packageName, view: null, ticket: null });
    }

    const line = `prediction ${ticket.root} ${names.join(', ')}: ${logTextOf(error)}`;

    this.ports.log(logTextOf(line));
    this.ports.changed(ticket.root, new Set(names));
  }

  /** The entries still waiting on `ticket`: a result of a ticket no entry points at changes nothing. */
  private entriesOf(ticket: PredictionTicket): PredictionEntry[] {
    const isOfTicket = (entry: PredictionEntry): boolean => entry.ticket === ticket;
    const values = this.entries.values();
    const all = [...values];

    return all.filter(isOfTicket);
  }
}
