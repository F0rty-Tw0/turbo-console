import type { RunLogEvent } from '@turbo-console/core';

import type {
  DependenciesOf,
  ProgressChanges,
  ProgressEventInput,
  ProgressInput,
  ProgressListener,
  ProgressOwner,
  ProgressRecord,
  ProgressRun,
  ProgressSettleInput
} from '../common/run-progress.type.ts';
import type { RunEntry } from '../common/run.type.ts';
import { progressKeyOf, runKeyOf } from '../utils/run-entry.util.ts';
import { progressRunOf } from '../utils/run-progress.util.ts';

const isAllVisible = (run: ProgressRun, visibleIds: Set<string>): boolean => {
  for (const taskId of run.records.keys()) {
    const isVisible = visibleIds.has(taskId);

    if (!isVisible) return false;
  }

  return true;
};

/** `run` itself, not a copy, when every id is visible: `prune` tells a change by identity. */
const visibleRunOf = (run: ProgressRun, visibleIds: Set<string>): ProgressRun => {
  const isUnchanged = isAllVisible(run, visibleIds);

  if (isUnchanged) return run;

  const records = new Map(run.records);

  for (const taskId of run.records.keys()) {
    const isVisible = visibleIds.has(taskId);

    if (!isVisible) records.delete(taskId);
  }

  const visible: ProgressRun = { ...run, records };

  return visible;
};

/**
 * The task progress of the runs the window launched (spec D8): one run per launch, holding a record per task id it
 * printed or settled, the owner's own id never among them. A run takes events and one settle until it is settled;
 * after that it only waits to be dropped by the next `begin` of its task or by `prune`. The D10 join, the tails and the
 * port come in U7e1.
 */
export class RunProgress implements ProgressChanges {
  private readonly runs = new Map<string, ProgressRun>();
  private readonly listeners = new Set<ProgressListener>();
  private readonly now: () => number;

  public constructor(now: () => number) {
    this.now = now;
  }

  /**
   * Adds an empty run for `owner`, unless it exists. Drops the settled runs of the same task (clear on rerun); an
   * unsettled one stays until its join settles it. Fires once if a dropped run held records.
   */
  public begin(owner: ProgressOwner, dependenciesOf: DependenciesOf): void {
    const key = progressKeyOf(owner);
    const isKnown = this.runs.has(key);

    if (isKnown) return;

    const hasDroppedRecords = this.dropSettledRunsOf(owner);
    const records = new Map<string, ProgressRecord>();
    const run: ProgressRun = { owner, dependenciesOf, records, settled: false };

    this.runs.set(key, run);

    if (hasDroppedRecords) this.fire(owner.root);
  }

  /** One log line of the run of `owner`, stamped now; ignored for an unknown or settled run. */
  public event(owner: ProgressOwner, event: RunLogEvent): void {
    const at = this.now();
    const input: ProgressEventInput = { kind: 'event', event, at };

    this.apply(owner, input);
  }

  /** Settles the run of `owner` by its entry; ignored for an unknown or settled run, or an entry still running. */
  public settle(owner: ProgressOwner, entry: RunEntry): void {
    const input: ProgressSettleInput = { kind: 'settle', entry };

    this.apply(owner, input);
  }

  /** Drops the records of `root` whose task is gone, running or not (spec §5.1); fires once if any was dropped. */
  public prune(root: string, visibleIds: Set<string>): void {
    let isPruned = false;

    for (const [key, run] of this.runs) {
      if (run.owner.root !== root) continue;

      const visible = visibleRunOf(run, visibleIds);

      if (visible === run) continue;

      this.runs.set(key, visible);
      isPruned = true;
    }

    if (isPruned) this.fire(root);
  }

  /** The record of `taskId` in every run of `root`. */
  public recordsOf(root: string, taskId: string): ProgressRecord[] {
    const records: ProgressRecord[] = [];

    for (const run of this.runs.values()) {
      if (run.owner.root !== root) continue;

      const record = run.records.get(taskId);

      if (record !== undefined) records.push(record);
    }

    return records;
  }

  /** Fires with the root of every change; returns the unsubscribe. */
  public onDidChange(listener: ProgressListener): () => void {
    this.listeners.add(listener);

    return (): void => {
      this.listeners.delete(listener);
    };
  }

  /** Whether a dropped run held records. */
  private dropSettledRunsOf(owner: ProgressOwner): boolean {
    const taskKey = runKeyOf(owner.root, owner.taskId);
    let hasRecords = false;

    for (const [key, run] of this.runs) {
      const runTaskKey = runKeyOf(run.owner.root, run.owner.taskId);
      const isDropped = run.settled && runTaskKey === taskKey;

      if (!isDropped) continue;

      hasRecords ||= run.records.size > 0;
      this.runs.delete(key);
    }

    return hasRecords;
  }

  /** Fires only when the reducer returns a new run, so a line that moves no record costs no change. */
  private apply(owner: ProgressOwner, input: ProgressInput): void {
    const key = progressKeyOf(owner);
    const run = this.runs.get(key);

    if (run === undefined || run.settled) return;

    const next = progressRunOf(run, input);

    if (next === run) return;

    this.runs.set(key, next);
    this.fire(owner.root);
  }

  private fire(root: string): void {
    for (const listener of this.listeners) listener(root);
  }
}
