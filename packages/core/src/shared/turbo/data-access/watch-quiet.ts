import type { Readable } from 'node:stream';

/**
 * Calls `onQuiet` each time none of `streams` has emitted a chunk for `quietMs` since the last one; no chunk yet arms
 * nothing, a null stream is skipped. Extra `data` listeners only reset the timer: execFile's own buffering is untouched.
 * Returns `stop`, which clears the timer and removes the listeners.
 */
export const watchQuiet = (streams: (Readable | null)[], quietMs: number, onQuiet: () => void): (() => void) => {
  let timer: NodeJS.Timeout | undefined;

  const onData = (): void => {
    if (timer === undefined) timer = setTimeout(onQuiet, quietMs);
    else timer.refresh();
  };

  for (const stream of streams) stream?.on('data', onData);

  const stop = (): void => {
    clearTimeout(timer);

    for (const stream of streams) stream?.off('data', onData);
  };

  return stop;
};
