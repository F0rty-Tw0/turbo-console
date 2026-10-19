import type { CachedWorkspace } from '../../common/cache.type.ts';
import type { SettledRead } from '../common/cache.type.ts';

/** `read` with its freshness check run for turbo `version`, or `null` when nothing was cached. */
export const settledRead = async (read: CachedWorkspace | null, version: string): Promise<SettledRead | null> => {
  if (read === null) return null;

  const isFresh = await read.isFresh(version);
  const settled: SettledRead = { model: read.model, isFresh };

  return settled;
};
