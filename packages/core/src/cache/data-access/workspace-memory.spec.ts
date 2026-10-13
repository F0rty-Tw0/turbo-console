import { describe, expect, it } from 'vitest';

import { getMemoryEntry, setMemoryEntry } from './workspace-memory.ts';
import type { CacheEntry } from '../common/cache.type.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/cache.stub.ts';

const entryFor = (root: string, key: string): CacheEntry => {
  const model = { ...WORKSPACE_MODEL_STUB, root };
  const entry: CacheEntry = { key, keyedPaths: ['package.json'], model };

  return entry;
};

describe('FEATURE: workspace memory cache', () => {
  describe('GIVEN a root never stored', () => {
    it('WHEN its entry is read THEN it is undefined', () => {
      const entry = getMemoryEntry('/memory/never');

      expect(entry).toBeUndefined();
    });
  });

  describe('GIVEN an entry stored for a root', () => {
    it('WHEN its root is read THEN it is that entry', () => {
      const stored = entryFor('/memory/one', 'a');

      setMemoryEntry(stored);

      expect(getMemoryEntry('/memory/one')).toBe(stored);
    });

    it('WHEN another root is read THEN it is undefined', () => {
      setMemoryEntry(entryFor('/memory/two', 'a'));

      const entry = getMemoryEntry('/memory/other');

      expect(entry).toBeUndefined();
    });

    it('WHEN a second entry is stored for the same root THEN the second replaces the first', () => {
      const second = entryFor('/memory/three', 'b');

      setMemoryEntry(entryFor('/memory/three', 'a'));
      setMemoryEntry(second);

      expect(getMemoryEntry('/memory/three')).toBe(second);
    });
  });
});
