import type { ChildProcess } from 'node:child_process';

import { watchQuiet } from './watch-quiet.ts';
import type { ExitStallCheck, RunTurboOptions } from '../common/turbo.type.ts';

/** How long a turbo whose output looks complete may stay quiet without exiting before the exit-stall guard stops it. */
const EXIT_STALL_MS = 5000;

const noop = (): void => undefined;

/**
 * Workaround for a turbo 2.11 bug on Windows (about 0.3% of launches; upstream issue not filed yet): after writing all
 * its output, turbo can deadlock inside `ExitProcess` (its main thread waits in a TLS destructor on a lock held by a
 * thread `ExitProcess` already killed) and never exit. Remove once the minimum supported turbo has the fix.
 *
 * With `exitStallCheck` on win32 (`platform`, default `process.platform`), calls `onStall` with the check, at most once,
 * when turbo has written nothing to stdout or stderr for `exitStallMs` (5 s by default) and `isEnd` accepts the stdout
 * tail `readStdout` gives. Anywhere else, or without the check, watches nothing. Returns the watch's `stop`.
 */
export const watchExitStall = (
  child: ChildProcess,
  options: RunTurboOptions,
  readStdout: () => string,
  onStall: (check: ExitStallCheck) => void
): (() => void) => {
  const check = options.exitStallCheck;
  const platform = options.platform ?? process.platform;

  if (check === undefined || platform !== 'win32') return noop;

  let hasStalled = false;

  const onQuiet = (): void => {
    if (hasStalled) return;

    const tail = readStdout();
    const isEnd = check.isEnd(tail);

    if (!isEnd) return;

    hasStalled = true;
    onStall(check);
  };

  const streams = [child.stdout, child.stderr];

  return watchQuiet(streams, options.exitStallMs ?? EXIT_STALL_MS, onQuiet);
};
