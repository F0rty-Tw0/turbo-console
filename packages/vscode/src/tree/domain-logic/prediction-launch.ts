import type { DryRunState } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { PredictionBatchPort, PredictionEntry, PredictionTicket, PredictionWaitPort } from '../common/prediction-batch.type.ts';
import type { PredictionBatch, PredictionLoadPorts, PredictionView } from '../common/prediction.type.ts';
import { entriesOfTicket } from '../utils/prediction-entries.util.ts';
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

    this.settleEmpty(ticket, packages, batch);

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
    for (const packageName of packages) {
      this.entries.delete(predictionKeyOf(ticket.root, packageName));
      this.waits.add(ticket.root, packageName);
    }

    this.batches.finished(ticket);
  }

  /** A package with no requested task has nothing to ask: it is Loaded with an empty answer at once. */
  private settleEmpty(ticket: PredictionTicket, packages: string[], batch: PredictionBatch | null): void {
    const asked = new Set(batch?.request.packages ?? []);
    const isEmpty = (packageName: string): boolean => !asked.has(packageName);
    const empty = packages.filter(isEmpty);
    const view: PredictionView = { settledAt: this.ports.now(), tasks: new Map() };

    for (const packageName of empty) {
      this.entries.set(predictionKeyOf(ticket.root, packageName), { root: ticket.root, packageName, view, ticket: null });
      this.batches.leave(ticket, packageName);
    }

    if (empty.length > 0) this.ports.changed(ticket.root);
  }

  private settled(ticket: PredictionTicket, batch: PredictionBatch, states: DryRunState[]): void {
    const tasks = predictionTasksOf(states, batch.requested);
    const entries = this.entries.values();
    const mine = entriesOfTicket(entries, ticket);
    const settledAt = this.ports.now();

    for (const { root, packageName } of mine) {
      const view: PredictionView = { settledAt, tasks: tasks.get(packageName) ?? new Map() };

      this.entries.set(predictionKeyOf(root, packageName), { root, packageName, view, ticket: null });
    }

    if (mine.length > 0) this.ports.changed(ticket.root);

    this.batches.finished(ticket);
  }

  /** An abort is not a failure: only entries that still wait on the ticket fail, with one line for the whole run. */
  private failed(ticket: PredictionTicket, error: unknown): void {
    const entries = this.entries.values();
    const mine = entriesOfTicket(entries, ticket);
    const isStale = ticket.controller.signal.aborted || mine.length === 0;

    if (!isStale) this.fail(ticket, mine, error);

    this.batches.finished(ticket);
  }

  private fail(ticket: PredictionTicket, mine: PredictionEntry[], error: unknown): void {
    const names = mine.map(nameOf).join(', ');

    for (const { root, packageName } of mine) {
      this.entries.set(predictionKeyOf(root, packageName), { root, packageName, view: null, ticket: null });
    }

    this.ports.log(logTextOf(`prediction ${ticket.root} ${names}: ${logTextOf(error)}`));
    this.ports.changed(ticket.root);
  }
}
