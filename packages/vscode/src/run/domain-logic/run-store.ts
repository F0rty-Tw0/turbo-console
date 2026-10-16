import type { RunMatch } from '@turbo-console/core';

import type { LiveIds, RunDefinition, RunEntry, RunKey, RunListener, RunLookup, RunRequest, Terminable } from '../common/run.type.ts';
import { endStateOf, isMatchedEnd } from '../utils/run-end.util.ts';
import { runKeyOf, runningEntryOf } from '../utils/run-entry.util.ts';

/**
 * An entry and the execution Stop terminates, once `executeTask` has handed it over, and whether Stop already did. A
 * terminate from `attach` doesn't count: it can reach VS Code before the task is active and be dropped.
 */
type RunSlot = {
  readonly entry: RunEntry;
  readonly execution: Terminable | null;
  readonly isTerminated?: boolean;
};

/**
 * The runs of the window, one entry per (root, task id), kept after they end so the tree shows the result. Every
 * method but `tryStart` and `setMatch` acts only on a running entry; anything else is ignored (spec §4.5 step 5). A
 * run's `launchedAt` is its token: a call carrying another run's token is ignored, so one run never changes another.
 */
export class RunStore {
  private readonly slots = new Map<RunKey, RunSlot>();
  private readonly listeners = new Set<RunListener>();

  public readonly get: RunLookup = (root, taskId) => this.slots.get(runKeyOf(root, taskId))?.entry;

  public readonly runningIds: LiveIds = (root) => {
    const ids = new Set<string>();

    for (const { entry } of this.slots.values()) {
      const isLive = entry.root === root && entry.state === 'running';

      if (isLive) ids.add(entry.taskId);
    }

    return ids;
  };

  /** Spec §4.5 step 1: decided synchronously, so two entry points or a double click cannot start two runs. */
  public tryStart(request: RunRequest, now: number): boolean {
    const key = runKeyOf(request.root, request.task.id);
    const isRunning = this.slots.get(key)?.entry.state === 'running';

    if (isRunning) return false;

    const entry = runningEntryOf(request, now);

    this.put({ entry, execution: null });

    return true;
  }

  /** Terminates `execution` when Stop came first or its run ended (a late launch); not while a newer run of the task
   * runs, since termination goes by the one VS Code task id all runs of a task share. */
  public attach(definition: RunDefinition, launchedAt: number, execution: Terminable): void {
    const slot = this.running(definition, launchedAt);

    if (slot === undefined) {
      const newerRun = this.running(definition);

      if (newerRun === undefined) execution.terminate();

      return;
    }

    this.slots.set(runKeyOf(definition.root, definition.id), { entry: slot.entry, execution });

    if (slot.entry.stopRequested) execution.terminate();
  }

  /**
   * A Stop after one that terminated the execution does nothing: terminating again, once VS Code has ended or is ending
   * the task, rejects unhandled (see `failStart`). A Stop before the execution arrived terminated nothing, so a later
   * one still does.
   */
  public requestStop(definition: RunDefinition): void {
    const slot = this.running(definition);

    if (slot === undefined || slot.isTerminated === true) return;

    slot.execution?.terminate();
    this.update({ ...slot, isTerminated: slot.execution !== null }, { stopRequested: true });
  }

  /**
   * Records the start; a Stop pressed before it terminates the execution again. VS Code drops a terminate sent before it
   * made the task active (a save prompt or an input can come first), and once the process runs, this one lands.
   */
  public processStarted(definition: RunDefinition, at: number, launchedAt?: number): void {
    const slot = this.running(definition, launchedAt);

    this.update(slot, { processStartedAt: at });

    if (slot?.entry.stopRequested === true) slot.execution?.terminate();
  }

  /** Ends the run per spec §4.5 step 6; `matching` stays true until `setMatch` when a summary match follows. */
  public processEnded(definition: RunDefinition, exitCode: number | undefined, at: number, launchedAt?: number): RunEntry | null {
    const slot = this.running(definition, launchedAt);

    if (slot === undefined) return null;

    const state = endStateOf(slot.entry.stopRequested, exitCode, slot.entry.task.persistent);
    const matching = isMatchedEnd(state, exitCode);

    return this.update(slot, { state, endedAt: at, exitCode: exitCode ?? null, matching });
  }

  /**
   * Ends a run whose process never started at `at` (`stopped` after a Stop), terminating its execution if attached,
   * unless `isTaskEnded`: VS Code already ended the task, and terminating it again rejects with "Task to terminate not
   * found" (`$terminateTask`), which nothing handles (`terminate(): void` drops the promise):
   * https://github.com/microsoft/vscode/blob/2a59476c9bfcb90b3ddc372c36762471b7dfad1c/src/vs/workbench/api/browser/mainThreadTask.ts#L699-L715
   * https://github.com/microsoft/vscode/blob/2a59476c9bfcb90b3ddc372c36762471b7dfad1c/src/vs/workbench/api/common/extHostTask.ts#L374-L375
   */
  public failStart(definition: RunDefinition, at: number, launchedAt?: number, isTaskEnded = false): RunEntry | null {
    const slot = this.running(definition, launchedAt);

    if (slot === undefined) return null;

    const state = slot.entry.stopRequested ? 'stopped' : 'failed-to-start';

    if (!isTaskEnded) slot.execution?.terminate();

    return this.update(slot, { state, endedAt: at });
  }

  /** Settles the run launched at `launchedAt` while it waits for its match; ignored for any other entry. */
  public setMatch(definition: RunDefinition, launchedAt: number, match: RunMatch | null): void {
    const slot = this.slots.get(runKeyOf(definition.root, definition.id));

    if (slot?.entry.matching !== true) return;

    if (slot.entry.launchedAt !== launchedAt) return;

    this.update(slot, { match, matching: false });
  }

  /** Drops the ended entries of `root` whose task is gone; a running entry stays until it ends. */
  public prune(root: string, visibleIds: Set<string>): void {
    for (const [key, { entry }] of this.slots) {
      const isVisible = visibleIds.has(entry.taskId);
      const isDropped = entry.root === root && !isVisible && entry.state !== 'running';

      if (isDropped) this.slots.delete(key);
    }
  }

  /** Fires on every change of an entry; returns the unsubscribe. */
  public onDidChange(listener: RunListener): () => void {
    this.listeners.add(listener);

    return (): void => {
      this.listeners.delete(listener);
    };
  }

  /** The running slot of `definition`; with `launchedAt`, only when it holds that run. */
  private running(definition: RunDefinition, launchedAt?: number): RunSlot | undefined {
    const slot = this.slots.get(runKeyOf(definition.root, definition.id));

    if (slot?.entry.state !== 'running') return undefined;

    const isOtherRun = launchedAt !== undefined && slot.entry.launchedAt !== launchedAt;

    return isOtherRun ? undefined : slot;
  }

  /** Applies `change` to the entry of `slot` and announces it; `null` when there is no slot. */
  private update(slot: RunSlot | undefined, change: Partial<RunEntry>): RunEntry | null {
    if (slot === undefined) return null;

    const entry: RunEntry = { ...slot.entry, ...change };

    this.put({ ...slot, entry });

    return entry;
  }

  private put(slot: RunSlot): void {
    this.slots.set(runKeyOf(slot.entry.root, slot.entry.taskId), slot);

    for (const listener of this.listeners) listener(slot.entry);
  }
}
