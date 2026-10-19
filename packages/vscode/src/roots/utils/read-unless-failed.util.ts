import type { LoadFailure, Resolved } from '../common/root.type.ts';

/**
 * Settles with `reading`, unless `resolving` settles first with a failure: then with that failure. After a resolve that
 * succeeds, both arms settle with `reading`, so neither is left pending past it; a `reading` that rejects rejects this.
 */
export const readUnlessFailed = async <TRead>(reading: Promise<TRead>, resolving: Promise<Resolved>): Promise<TRead | LoadFailure> => {
  const failedFirst = async (): Promise<TRead | LoadFailure> => {
    const resolved = await resolving;

    if (resolved.kind === 'error') return resolved;

    return reading;
  };
  const failed = failedFirst();

  return Promise.race([reading, failed]);
};
