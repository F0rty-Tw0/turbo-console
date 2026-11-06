import type { ChildProcess } from 'node:child_process';

import type { ExitStallCheck, RunTurboOptions } from '../common/turbo.type.ts';

/** How long a turbo whose output looks complete may stay quiet without exiting before the exit-stall guard stops it. */
const EXIT_STALL_MS = 5000;

const noop = (): void => undefined;

/**
 * Workaround F-U7-17 for a turbo 2.11 bug on Windows (about 0.3% of launches; upstream issue pending): after writing all
 * its output, turbo can deadlock inside `ExitProcess` (its main thread waits in a TLS destructor on a lock held by a
 * thread `ExitProcess` already killed) and never exit. Expires once the minimum supported turbo exits cleanly on
 * Windows: remove it then.
 *
 * With `exitStallCheck` on win32 (`platform`, default `process.platform`), calls `onStall` with the check, at most once,
 * when turbo has written nothing to stdout or stderr for `exitStallMs` (5 s by default) and `isEnd` accepts the stdout
 * tail `readStdout` gives. Anywhere else, or without the check, watches nothing. The check waits one `setImmediate`
 * after the quiet timer and is skipped when a chunk arrived meanwhile: after an event-loop stall the timer can fire
 * before the poll phase reads output already in the pipe. Extra `data` listeners only reset the timer: execFile's own
 * buffering is untouched. Returns `stop`, which clears the timer and the pending check and removes the listeners.
 */
export const watchExitStall = (
  child: Pick<ChildProcess, 'stdout' | 'stderr'>,
  options: RunTurboOptions,
  readStdout: () => string,
  onStall: (check: ExitStallCheck) => void
): (() => void) => {
  const check = options.exitStallCheck;
  const platform = options.platform ?? process.platform;

  if (check === undefined || platform !== 'win32') return noop;

  const streams = [child.stdout, child.stderr];
  let chunkCount = 0;
  let hasStalled = false;
  let timer: NodeJS.Timeout | undefined;
  let pending: NodeJS.Immediate | undefined;

  const onQuiet = (seenCount: number): void => {
    if (hasStalled || chunkCount !== seenCount) return;

    const tail = readStdout();
    const isEnd = check.isEnd(tail);

    if (!isEnd) return;

    hasStalled = true;
    onStall(check);
  };

  const onTimer = (): void => {
    pending = setImmediate(onQuiet, chunkCount);
  };

  const onData = (): void => {
    chunkCount += 1;

    if (timer === undefined) timer = setTimeout(onTimer, options.exitStallMs ?? EXIT_STALL_MS);
    else timer.refresh();
  };

  for (const stream of streams) stream?.on('data', onData);

  const stop = (): void => {
    clearTimeout(timer);
    clearImmediate(pending);

    for (const stream of streams) stream?.off('data', onData);
  };

  return stop;
};
