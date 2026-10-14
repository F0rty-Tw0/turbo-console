import { abortError } from './run-turbo.ts';

/**
 * `start()`'s result, unless `signal` aborts first: then `runTurbo`'s `AbortError`. Not started when `signal` already
 * aborted, so the caller's abort wins over any error `start()` or a check of its result would raise; an abort while it
 * runs rejects at once, so reads hung on a slow filesystem, or a spawn shared with other callers, cannot hold it back
 * (they are left to finish). The abort listener is removed either way.
 */
export const untilAborted = async <T>(start: () => Promise<T>, signal: AbortSignal | undefined): Promise<T> => {
  if (signal === undefined) return start();

  if (signal.aborted) throw abortError(signal, '');

  const { promise: aborted, reject } = Promise.withResolvers<never>();
  const onAbort = (): void => reject(abortError(signal, ''));

  signal.addEventListener('abort', onAbort, { once: true });

  try {
    return await Promise.race([start(), aborted]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
};
