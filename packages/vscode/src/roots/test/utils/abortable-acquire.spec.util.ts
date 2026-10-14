/** A slot request that stays queued until its signal aborts, then rejects with the reason (at once when already aborted). */
export const acquireUntilAborted = async (signal: AbortSignal): Promise<() => void> => {
  const { promise, reject } = Promise.withResolvers<() => void>();
  const abort = (): void => reject(signal.reason);

  if (signal.aborted) abort();

  signal.addEventListener('abort', abort, { once: true });

  return promise;
};
