/**
 * Settles with `work` or rejects with `signal.reason` as soon as the signal aborts, whichever comes first. `work` is
 * not started when the signal is already aborted. The abort listener is always removed; a `work` that loses the race
 * keeps running, so it must honor the signal itself.
 */
export const raceSignal = async <T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> => {
  signal.throwIfAborted();

  const aborted = Promise.withResolvers<never>();
  const abort = (): void => aborted.reject(signal.reason);

  signal.addEventListener('abort', abort, { once: true });

  try {
    return await Promise.race([work(), aborted.promise]);
  } finally {
    signal.removeEventListener('abort', abort);
  }
};
