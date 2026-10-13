import type { SpawnMark } from '../../common/cache.type.ts';

/** A spawn mark started at `startedAt` that saw no root keyed file, so only the mtime and manifest checks can make a store stale. */
export const markAt = (startedAt: number): SpawnMark => {
  const mark: SpawnMark = { startedAt, rootFiles: [] };

  return mark;
};
