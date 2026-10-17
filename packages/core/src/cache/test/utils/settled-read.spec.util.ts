import type { CachedWorkspace } from '../../common/cache.type.ts';
import type { SettledRead } from '../common/cache.type.ts';

/** `read` with its freshness check run, or `null` when nothing was cached. */
export const settledRead = async (read: CachedWorkspace | null): Promise<SettledRead | null> => {
  if (read === null) return null;

  const isFresh = await read.isFresh();
  const settled: SettledRead = { model: read.model, isFresh };

  return settled;
};
