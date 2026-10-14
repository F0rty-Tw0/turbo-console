import type { RunMatch } from '@turbo-console/core';

import type { RunDefinition, RunEntry, RunKey, RunLookup, RunRequest, Terminable } from '../common/run.type.ts';
import { endStateOf, isMatchedEnd } from '../utils/run-end.util.ts';
import { runKeyOf, runningEntryOf } from '../utils/run-entry.util.ts';

type ChangeListener = (entry: RunEntry) => void;

/** An entry and the execution Stop terminates, once `executeTask` has handed it over. */
type RunSlot = {
  readonly entry: RunEntry;
  readonly execution: Terminable | null;
};

/**
 * The runs of the window, one entry per (root, task id), kept after they end so the tree shows the result. Every
 * method but `tryStart` and `setMatch` acts only on a running entry; anything else is ignored (spec §4.5 step 5).
 */
export class RunStore {
  private readonly slots = new Map<RunKey, RunSlot>();
  private readonly listeners = new Set<ChangeListener>();

  public readonly get: RunLookup = (root, taskId) => this.slots.get(runKeyOf(root, taskId))?.entry;

  /** Spec §4.5 step 1: decided synchronously, so two entry points or a double click cannot start two runs. */
  public tryStart(request: RunRequest, now: number): boolean {
    const key = runKeyOf(request.root, request.task.id);
    const existing = this.slots.get(key);
    const isRunning = existing?.entry.state === 'running';

    if (isRunning) return false;

    const entry = runningEntryOf(request, now);

    this.put({ entry, execution: null });

    return true;
  }

  /** Terminates `execution` at once when Stop was pressed before `executeTask` resolved. */
  public attach(definition: RunDefinition, execution: Terminable): void {
    const slot = this.running(definition);

    if (slot === undefined) return;

    this.slots.set(runKeyOf(definition.root, definition.id), { entry: slot.entry, execution });

    if (slot.entry.stopRequested) execution.terminate();
  }

  public requestStop(definition: RunDefinition): void {
    const slot = this.running(definition);

    if (slot === undefined) return;

    const entry: RunEntry = { ...slot.entry, stopRequested: true };

    this.put({ entry, execution: slot.execution });
    slot.execution?.terminate();
  }

  public processStarted(definition: RunDefinition, at: number): void {
    const slot = this.running(definition);

    if (slot === undefined) return;

    const entry: RunEntry = { ...slot.entry, processStartedAt: at };

    this.put({ entry, execution: slot.execution });
  }

  /** Ends the run per spec §4.5 step 6; `matching` stays true until `setMatch` when a summary match follows. */
  public processEnded(definition: RunDefinition, exitCode: number | undefined, at: number): RunEntry | null {
    const slot = this.running(definition);

    if (slot === undefined) return null;

    const state = endStateOf(slot.entry.stopRequested, exitCode);
    const matching = isMatchedEnd(state, exitCode);
    const entry: RunEntry = { ...slot.entry, state, endedAt: at, exitCode: exitCode ?? null, matching };

    this.put({ entry, execution: slot.execution });

    return entry;
  }

  /** Ends a run whose process never started as `failed-to-start`, terminating its execution if one was handed over. */
  public failStart(definition: RunDefinition): RunEntry | null {
    const slot = this.running(definition);

    if (slot === undefined) return null;

    const entry: RunEntry = { ...slot.entry, state: 'failed-to-start' };

    this.put({ entry, execution: slot.execution });
    slot.execution?.terminate();

    return entry;
  }

  /** Settles a run waiting for its match; ignored for any other entry, so a newer run never gets an older run's match. */
  public setMatch(definition: RunDefinition, match: RunMatch | null): void {
    const slot = this.slots.get(runKeyOf(definition.root, definition.id));

    if (slot?.entry.matching !== true) return;

    const entry: RunEntry = { ...slot.entry, match, matching: false };

    this.put({ entry, execution: slot.execution });
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
  public onDidChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);

    return (): void => {
      this.listeners.delete(listener);
    };
  }

  private running(definition: RunDefinition): RunSlot | undefined {
    const slot = this.slots.get(runKeyOf(definition.root, definition.id));

    return slot?.entry.state === 'running' ? slot : undefined;
  }

  private put(slot: RunSlot): void {
    this.slots.set(runKeyOf(slot.entry.root, slot.entry.taskId), slot);

    for (const listener of this.listeners) listener(slot.entry);
  }
}
