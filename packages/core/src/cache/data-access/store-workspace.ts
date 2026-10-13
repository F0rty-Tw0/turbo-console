import { readCacheFile, writeCacheFile } from './cache-file.ts';
import { hashKeyedFiles } from './keyed-files.ts';
import { getMemoryEntry, setMemoryEntry } from './workspace-memory.ts';
import type { GraphPackage } from '../../shared/turbo/common/turbo.type.ts';
import type { WorkspaceModel } from '../../workspace/common/workspace-model.type.ts';
import type { CacheEntry, SpawnMark } from '../common/cache.type.ts';
import { cacheKeyOf, hasChangedRootFile, hasVanishedManifest, isEditedSince, keyedPathsOf } from '../utils/cache-key.util.ts';

/**
 * Spec §4.4 steps 5–6: keys `model` over the keyed files of `packages` (every graph package, hidden ones included) and
 * keeps it in memory, then writes it to `cacheDir` when one is given. Memory holds `model` itself, not a copy, so the
 * caller hands out copies of it. The key is `null`, so the entry is never fresh, when a keyed file was written at or
 * after `mark.startedAt` less the slack, a manifest turbo read is now missing, or a root keyed file hashes differently
 * from `mark.rootFiles` (an edit or delete the mtime check misses). Known limit: a root file edited A→B→A during the
 * spawn with its mtime put back still stores a fresh key, since turbo read B but both hashes see A. Never rejects:
 * resolves `null`, or the write failure's message.
 */
export const storeWorkspace = async (
  model: WorkspaceModel,
  packages: GraphPackage[],
  mark: SpawnMark,
  cacheDir: string | undefined
): Promise<string | null> => {
  const keyedPaths = keyedPathsOf(packages);
  const files = await hashKeyedFiles(model.root, keyedPaths);
  const fullKey = cacheKeyOf(files, model.turboVersion);
  const isVanished = hasVanishedManifest(files);
  const isEdited = isEditedSince(files, mark.startedAt);
  const isRootChanged = hasChangedRootFile(mark.rootFiles, files);
  const isStale = isVanished || isEdited || isRootChanged;
  const key = isStale ? null : fullKey;
  const entry: CacheEntry = { key, keyedPaths, model };

  setMemoryEntry(entry);

  if (cacheDir === undefined) return null;

  return writeCacheFile(cacheDir, entry);
};

/**
 * The memory entry of `root`, else its cache file in `cacheDir` (a hit fills memory), else `null`. An entry stored
 * while the file is read wins over the older file. Never rejects.
 */
export const findEntry = async (root: string, cacheDir: string): Promise<CacheEntry | null> => {
  const remembered = getMemoryEntry(root);

  if (remembered !== undefined) return remembered;

  const entry = await readCacheFile(cacheDir, root);
  const storedMeanwhile = getMemoryEntry(root);

  if (storedMeanwhile !== undefined) return storedMeanwhile;

  if (entry !== null) setMemoryEntry(entry);

  return entry;
};
