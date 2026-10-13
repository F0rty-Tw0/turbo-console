import { describe, expect, it } from 'vitest';

import { newestFirst } from './run-summary-order.util.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';

const OLD: RunSummaryFile = { name: 'b.json', mtimeMs: 1000 };

const NEW: RunSummaryFile = { name: 'a.json', mtimeMs: 2000 };

const TIED_LOW: RunSummaryFile = { name: 'c.json', mtimeMs: 3000 };

const TIED_HIGH: RunSummaryFile = { name: 'd.json', mtimeMs: 3000 };

describe('FEATURE: run summary order', () => {
  describe('GIVEN files with different mtimes', () => {
    it('WHEN ordered THEN the newest comes first, whatever the names', () => {
      const names = newestFirst([OLD, NEW]);

      expect(names).toStrictEqual(['a.json', 'b.json']);
    });
  });

  describe('GIVEN two files with the same mtime', () => {
    it('WHEN ordered THEN the larger name comes first, and both precede older files', () => {
      const names = newestFirst([OLD, TIED_LOW, NEW, TIED_HIGH]);

      expect(names).toStrictEqual(['d.json', 'c.json', 'a.json', 'b.json']);
    });
  });

  describe('GIVEN no file', () => {
    it('WHEN ordered THEN there is no name', () => {
      expect(newestFirst([])).toStrictEqual([]);
    });
  });
});
