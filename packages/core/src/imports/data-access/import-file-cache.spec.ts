import { describe, expect, it } from 'vitest';

import { ImportFileCache } from './import-file-cache.ts';
import type { CachedFile } from '../common/import-scan.type.ts';
import { CACHED_FILE_STUB } from '../test/stubs/import-scan.stub.ts';

const mapOf = (count: number, prefix: string): Map<string, CachedFile> => {
  const map = new Map<string, CachedFile>();

  for (let index = 0; index < count; index += 1) map.set(`${prefix}${index}.ts`, CACHED_FILE_STUB);

  return map;
};

describe('FEATURE: import file cache', () => {
  describe('GIVEN a new cache', () => {
    it('WHEN filesOf any dir THEN it is an empty map', () => {
      const cache = new ImportFileCache();

      const files = cache.filesOf('/a');

      expect(files.size).toBe(0);
    });
  });

  describe('GIVEN dir A swapped in', () => {
    it('WHEN filesOf A THEN it is that same map', () => {
      const cache = new ImportFileCache();
      const files = mapOf(2, 'a');

      cache.swap('/a', files);

      const actual = cache.filesOf('/a');

      expect(actual).toBe(files);
    });

    it('WHEN A is swapped again THEN filesOf A is the second map and B is untouched', () => {
      const cache = new ImportFileCache();
      const second = mapOf(1, 'second');
      const other = mapOf(1, 'b');

      cache.swap('/a', mapOf(2, 'a'));
      cache.swap('/b', other);

      cache.swap('/a', second);

      expect(cache.filesOf('/a')).toBe(second);
      expect(cache.filesOf('/b')).toBe(other);
    });
  });

  describe('GIVEN A holds 19,999 files', () => {
    it('WHEN B swaps in 1 THEN A and B both stay (total 20,000)', () => {
      const cache = new ImportFileCache();

      cache.swap('/a', mapOf(19_999, 'a'));

      cache.swap('/b', mapOf(1, 'b'));

      expect(cache.filesOf('/a').size).toBe(19_999);
      expect(cache.filesOf('/b').size).toBe(1);
    });

    it('WHEN B swaps in 2 THEN A is empty and B holds 2', () => {
      const cache = new ImportFileCache();

      cache.swap('/a', mapOf(19_999, 'a'));

      cache.swap('/b', mapOf(2, 'b'));

      expect(cache.filesOf('/a').size).toBe(0);
      expect(cache.filesOf('/b').size).toBe(2);
    });
  });

  describe('GIVEN A and B hold 10,000 files each', () => {
    it("WHEN A swaps in 10,000 THEN B is kept and A holds the new map (A's own old size is not counted)", () => {
      const cache = new ImportFileCache();
      const replacement = mapOf(10_000, 'new');

      cache.swap('/a', mapOf(10_000, 'a'));
      cache.swap('/b', mapOf(10_000, 'b'));

      cache.swap('/a', replacement);

      expect(cache.filesOf('/a')).toBe(replacement);
      expect(cache.filesOf('/b').size).toBe(10_000);
    });
  });

  describe('GIVEN A and B hold 10 files each', () => {
    it('WHEN C swaps in 19,981 THEN A and B are empty and C is kept', () => {
      const cache = new ImportFileCache();

      cache.swap('/a', mapOf(10, 'a'));
      cache.swap('/b', mapOf(10, 'b'));

      cache.swap('/c', mapOf(19_981, 'c'));

      expect(cache.filesOf('/a').size).toBe(0);
      expect(cache.filesOf('/b').size).toBe(0);
      expect(cache.filesOf('/c').size).toBe(19_981);
    });
  });
});
