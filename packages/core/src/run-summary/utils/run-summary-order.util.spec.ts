import { describe, expect, it } from 'vitest';

import { newestFirst } from './run-summary-order.util.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';

const OLD: RunSummaryFile = { name: 'b.json', mtimeMs: 1000, size: 2 };

const NEW: RunSummaryFile = { name: 'a.json', mtimeMs: 2000, size: 2 };

const TIED_LOW: RunSummaryFile = { name: 'c.json', mtimeMs: 3000, size: 2 };

const TIED_HIGH: RunSummaryFile = { name: 'd.json', mtimeMs: 3000, size: 2 };

describe('FEATURE: run summary order', () => {
  describe('GIVEN files with different mtimes', () => {
    it('WHEN ordered THEN the newest comes first, whatever the names', () => {
      const files = newestFirst([OLD, NEW]);

      expect(files).toStrictEqual([NEW, OLD]);
    });
  });

  describe('GIVEN two files with the same mtime', () => {
    it('WHEN ordered THEN the larger name comes first, and both precede older files', () => {
      const files = newestFirst([OLD, TIED_LOW, NEW, TIED_HIGH]);

      expect(files).toStrictEqual([TIED_HIGH, TIED_LOW, NEW, OLD]);
    });
  });

  describe('GIVEN no file', () => {
    it('WHEN ordered THEN there is no file', () => {
      expect(newestFirst([])).toStrictEqual([]);
    });
  });
});
