import { setTimeout as sleep } from 'node:timers/promises';

/** Settles as `answering` does, or rejects with `message` once `ms` pass on Node's clock with no answer. */
export const boundedAnswer = async <T>(answering: Promise<T>, ms: number, message: string): Promise<T> => {
  const abort = new AbortController();
  const signalOptions = { signal: abort.signal };
  const timedOut = sleep(ms, undefined, signalOptions).then((): never => {
    throw new Error(message);
  });

  try {
    return await Promise.race([answering, timedOut]);
  } finally {
    abort.abort();
  }
};
