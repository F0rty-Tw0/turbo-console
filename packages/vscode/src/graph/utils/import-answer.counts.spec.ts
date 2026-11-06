import { IMPORT_SITES_MAX, MANIFEST_FILE_MAX } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import {
  answerOf,
  foundSitesOf,
  importScanOf,
  linesUpTo,
  matchedFileOf,
  scannedFileOf,
  sourceImportOf
} from '../test/utils/import-scan.spec.util.ts';

// Starts with 'p' so it sorts before 'x.ts': the drop-before-cut row needs the dropped site first.
const LONG_FILE = `${'p'.repeat(MANIFEST_FILE_MAX - 2)}.ts`;

const EXACT_FILE = `${'p'.repeat(MANIFEST_FILE_MAX - 3)}.ts`;

describe('FEATURE: answer counts', () => {
  describe('GIVEN the IMPORT_SITES_MAX cap', () => {
    it('WHEN 201 sites match in descending line order THEN the first 200 by order are sent, the 201st is not, and total is 201', () => {
      const lines = linesUpTo(IMPORT_SITES_MAX + 1).toReversed();

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

    it('WHEN it holds 1 site and x.ts holds 200 THEN all 200 sites of x.ts are sent and total is 201', () => {
      const lines = linesUpTo(IMPORT_SITES_MAX);
      const files = [matchedFileOf(LONG_FILE, 1), matchedFileOf('x.ts', ...lines)];

      const result = answerOf(importScanOf(files));
      const sentFiles = new Set(foundSitesOf(result).map((site) => site.file));

      expect(result).toMatchObject({ kind: 'found', total: IMPORT_SITES_MAX + 1 });
      expect(foundSitesOf(result)).toHaveLength(IMPORT_SITES_MAX);
      expect([...sentFiles]).toStrictEqual(['x.ts']);
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

  describe('GIVEN a file path exactly MANIFEST_FILE_MAX long', () => {
    it('WHEN it holds 1 site THEN its site is sent and the counts are unchanged', () => {
      const result = answerOf(importScanOf([matchedFileOf(EXACT_FILE, 1)], { scanned: 5, skipped: 2 }));

      expect(result).toMatchObject({ kind: 'found', scanned: 5, skipped: 2, total: 1 });
      expect(foundSitesOf(result).map((site) => site.file)).toStrictEqual([EXACT_FILE]);
    });
  });
});
