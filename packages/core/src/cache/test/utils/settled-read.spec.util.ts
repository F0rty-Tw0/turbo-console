// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import type { TurboBinary } from '../../../binary/common/index.ts';
import type { CachedWorkspace } from '../../common/cache.type.ts';
import type { SettledRead } from '../common/cache.type.ts';

/** `read` with its freshness check run for `binary`, or `null` when nothing was cached. */
export const settledRead = async (read: CachedWorkspace | null, binary: TurboBinary): Promise<SettledRead | null> => {
  if (read === null) return null;

  const isFresh = await read.isFresh(binary);
  const settled: SettledRead = { model: read.model, isFresh };

  return settled;
};
