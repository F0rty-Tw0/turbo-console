/**
 * Settles with `work` or rejects with `signal.reason` as soon as the signal aborts, whichever comes first; a value
 * that arrives once the signal has aborted is dropped for the reason. `work` is not started when the signal is already
 * aborted. The abort listener is always removed; a `work` that loses the race keeps running, so it must honor the
 * signal itself.
 */
export const raceSignal = async <T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> => {
  signal.throwIfAborted();

  const aborted = Promise.withResolvers<never>();
  const abort = (): void => aborted.reject(signal.reason);

  signal.addEventListener('abort', abort, { once: true });

  try {
    const value = await Promise.race([work(), aborted.promise]);

    signal.throwIfAborted();

    return value;
  } finally {
    signal.removeEventListener('abort', abort);
  }
};
