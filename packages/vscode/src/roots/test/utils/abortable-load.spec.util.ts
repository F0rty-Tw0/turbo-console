import type { TurboBinary, WorkspaceModel } from '@turbo-console/core';

/** A load that never settles on its own and rejects as soon as its signal aborts, or at once when it already has. */
export const loadUntilAborted = async (_binary: TurboBinary, signal: AbortSignal): Promise<WorkspaceModel> => {
  const { promise, reject } = Promise.withResolvers<WorkspaceModel>();
  const abort = (): void => reject(new Error('aborted'));

  if (signal.aborted) abort();

  signal.addEventListener('abort', abort, { once: true });

  return promise;
};
