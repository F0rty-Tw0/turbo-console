import { setTimeout as delay } from 'node:timers/promises';

import { loadsOf, log, waitFor } from './suite-env.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

/** Long enough for VS Code's file watcher to report a write, so a `whenIdle` after it sees the debounce. */
const EVENT_WINDOW_MS = 1000;

/** Lets VS Code report a write, then waits for the root's debounce and any load it started. */
export const whenQuiet = async (api: TurboConsoleApi, root: string): Promise<void> => {
  await delay(EVENT_WINDOW_MS);
  await api.whenIdle(root);
};

/**
 * Waits for a load past the first `before` records of `root`, then for quiet, so a second load shows too. Logs how long
 * the first took to start and returns how many loads ran past `before`.
 */
export const whenLoadedAfter = async (api: TurboConsoleApi, root: string, before: number): Promise<number> => {
  const records = loadsOf(api, root);
  const start = performance.now();

  await waitFor('watch load', () => records.length > before);

  const startedMs = performance.now() - start;

  await whenQuiet(api, root);

  const loads = records.length - before;

  log(`watch load started after ${startedMs.toFixed(1)} ms; loads ${loads}`);

  return loads;
};
