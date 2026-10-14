import { vi } from 'vitest';

import type { CoordinatorPorts } from '../../common/coordinator.type.ts';
import type { LoadMode, LoadResult, LoadedModel } from '../../common/root.type.ts';
import type { DeferredPorts, DeferredRun } from '../common/coordinator.type.ts';

const NOW = 1_000;

/** Coordinator ports whose runs stay pending until the spec settles them; the view starts hidden. */
export const deferredPorts = (): DeferredPorts => {
  const runs: DeferredRun[] = [];
  let visible = false;
  const run = async (mode: LoadMode, signal: AbortSignal, publish: (result: LoadedModel) => void): Promise<LoadResult> => {
    const { promise, resolve } = Promise.withResolvers<LoadResult>();

    runs.push({ mode, signal, publish, settle: resolve });

    return promise;
  };
  const setVisible = (value: boolean): void => {
    visible = value;
  };
  const ports: CoordinatorPorts = {
    run: vi.fn(run),
    isVisible: vi.fn(() => visible),
    apply: vi.fn(),
    record: vi.fn(),
    now: vi.fn(() => NOW)
  };
  const deferred: DeferredPorts = { ports, runs, setVisible };

  return deferred;
};

export const runAt = (deferred: DeferredPorts, index: number): DeferredRun => {
  const run = deferred.runs[index];

  if (run === undefined) throw new Error(`no run #${index}; ${deferred.runs.length} started`);

  return run;
};

/** Returns a check that reads `true` once `promise` has resolved (after `flushSettles`). */
export const settledFlag = (promise: Promise<void>): (() => boolean) => {
  let isSettled = false;
  const markSettled = (): void => {
    isSettled = true;
  };

  void promise.then(markSettled);

  return (): boolean => isSettled;
};

/** Lets every pending promise callback run, so a settled run has reached the coordinator. */
export const flushSettles = async (): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<undefined>();
  const done = (): void => {
    resolve(undefined);
  };

  setImmediate(done);

  await promise;
};
