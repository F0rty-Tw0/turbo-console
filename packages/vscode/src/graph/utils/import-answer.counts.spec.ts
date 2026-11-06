import type { PackageImportScan } from '@turbo-console/core';
import { IMPORT_SITES_MAX, MANIFEST_FILE_MAX } from '@turbo-console/webview-ui';
import type { EdgeImportsResult } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { answerImports } from './import-answer.util.ts';
import {
  IMPORT_EDGE,
  foundSitesOf,
  frozenScanOf,
  importScanOf,
  matchedFileOf,
  scannedFileOf,
  sourceImportOf
} from '../test/utils/import-scan.spec.util.ts';

const LONG_FILE = `${'p'.repeat(MANIFEST_FILE_MAX - 2)}.ts`;

const EXACT_FILE = `${'p'.repeat(MANIFEST_FILE_MAX - 3)}.ts`;

const answerOf = (scan: PackageImportScan): EdgeImportsResult => answerImports(frozenScanOf(scan), IMPORT_EDGE);

const linesUpTo = (count: number): number[] => Array.from({ length: count }, (_none, line) => line);

describe('FEATURE: answer counts', () => {
  describe('GIVEN the IMPORT_SITES_MAX cap', () => {
    it('WHEN 201 sites match THEN 200 are sent, the 201st by order is not, and total is 201', () => {
      const lines = linesUpTo(IMPORT_SITES_MAX + 1);

      const result = answerOf(importScanOf([matchedFileOf('x.ts', ...lines)]));

      expect(result).toMatchObject({ kind: 'found', total: IMPORT_SITES_MAX + 1 });
      expect(foundSitesOf(result).map((site) => site.line)).toStrictEqual(linesUpTo(IMPORT_SITES_MAX));
    });

    it('WHEN exactly 200 sites match THEN all 200 are sent and total is 200', () => {
      const lines = linesUpTo(IMPORT_SITES_MAX);

      const result = answerOf(importScanOf([matchedFileOf('x.ts', ...lines)]));

      expect(result).toMatchObject({ kind: 'found', total: IMPORT_SITES_MAX });
      expect(foundSitesOf(result)).toHaveLength(IMPORT_SITES_MAX);
    });
  });

  describe('GIVEN a file path longer than MANIFEST_FILE_MAX', () => {
    it('WHEN it holds 2 sites and a.ts holds 1 THEN 1 site is sent, total 3, scanned -1, skipped +1', () => {
      const files = [matchedFileOf(LONG_FILE, 1, 2), matchedFileOf('a.ts', 4)];

      const result = answerOf(importScanOf(files, { scanned: 5, skipped: 2 }));

      expect(result).toMatchObject({ kind: 'found', scanned: 4, skipped: 3, total: 3 });
      expect(foundSitesOf(result).map((site) => site.file)).toStrictEqual(['a.ts']);
    });

    it('WHEN the path is exactly MANIFEST_FILE_MAX long THEN its site is sent and the counts are unchanged', () => {
      const result = answerOf(importScanOf([matchedFileOf(EXACT_FILE, 1)], { scanned: 5, skipped: 2 }));

      expect(result).toMatchObject({ kind: 'found', scanned: 5, skipped: 2, total: 1 });
      expect(foundSitesOf(result).map((site) => site.file)).toStrictEqual([EXACT_FILE]);
    });

    it('WHEN the only matching file has such a path THEN it is none with scanned -1 and skipped +1', () => {
      const result = answerOf(importScanOf([matchedFileOf(LONG_FILE, 1, 2)], { scanned: 5, skipped: 2, limit: 'time' }));

      expect(result).toStrictEqual({ kind: 'none', scanned: 4, skipped: 3, limit: 'time' });
    });

    it('WHEN it holds no import of B THEN scanned and skipped are unchanged', () => {
      const other = scannedFileOf(LONG_FILE, [sourceImportOf('@company/other', 1)]);

      const result = answerOf(importScanOf([other, matchedFileOf('a.ts', 4)], { scanned: 5, skipped: 2 }));

      expect(result).toMatchObject({ kind: 'found', scanned: 5, skipped: 2, total: 1 });
    });
  });
});
