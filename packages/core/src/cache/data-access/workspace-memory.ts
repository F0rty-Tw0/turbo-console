import type { CacheEntry } from '../common/cache.type.ts';

/** Spec §4.5: the last entry this process loaded or read from disk for each root, keyed by `model.root`. */
const entries = new Map<string, CacheEntry>();

export const getMemoryEntry = (root: string): CacheEntry | undefined => entries.get(root);

export const setMemoryEntry = (entry: CacheEntry): void => {
  entries.set(entry.model.root, entry);
};
