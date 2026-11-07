import type { ImportScanLimit, SourceImport } from '@turbo-console/core';
import { ENTRY_TEXT_MAX } from '@turbo-console/webview-ui';
import type { ImportKind, ImportLimit, ImportSite } from '@turbo-console/webview-ui';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { answerImports } from './import-answer.util.ts';
import { TARGET_NAME } from '../test/common/import-edge.const.ts';
import { IMPORT_EDGE_STUB } from '../test/stubs/import-edge.stub.ts';
import {
  answerOf,
  foundSitesOf,
  frozenScanOf,
  importScanOf,
  matchedFileOf,
  placesOf,
  scannedFileOf,
  sourceImportOf,
  tsconfigPathsOf
} from '../test/utils/import-scan.spec.util.ts';

const ELLIPSIS = String.fromCodePoint(0x2026);

const SHOWN = String.fromCodePoint(0xfffd);

const LIMITS: ImportScanLimit[] = ['files', 'entries', 'time'];

const onlySiteOf = (source: SourceImport): ImportSite | undefined => {
  const result = answerOf(importScanOf([scannedFileOf('x.ts', [source])]));

  return foundSitesOf(result)[0];
};

describe('FEATURE: answer one edge imports from a package scan', () => {
  describe('GIVEN matches in several files', () => {
    it('WHEN files come in walk order B.ts, a/b.ts, a.ts, c.ts THEN sites are B.ts, a.ts, a/b.ts, c.ts by code unit, each by line', () => {
      const files = [matchedFileOf('B.ts', 1), matchedFileOf('a/b.ts', 4), matchedFileOf('a.ts', 3, 5), matchedFileOf('c.ts', 0)];

      const result = answerOf(importScanOf(files));

      expect(placesOf(result)).toStrictEqual(['B.ts:1', 'a.ts:3', 'a.ts:5', 'a/b.ts:4', 'c.ts:0']);
    });

    it('WHEN two imports of B sit on one line THEN both are sent in source order', () => {
      const first = sourceImportOf(TARGET_NAME, 3, { text: 'first' });
      const second = sourceImportOf(TARGET_NAME, 3, { text: 'second' });

      const result = answerOf(importScanOf([scannedFileOf('x.ts', [first, second])]));

      expect(foundSitesOf(result).map((site) => site.text)).toStrictEqual(['first', 'second']);
    });

    it('WHEN imports of B arrive out of line order in one file (lines 9, 2) THEN they are sent 2, 9', () => {
      const result = answerOf(importScanOf([matchedFileOf('x.ts', 9, 2)]));

      expect(placesOf(result)).toStrictEqual(['x.ts:2', 'x.ts:9']);
    });

    it('WHEN a file imports B and C THEN only the B import is sent and total counts it alone', () => {
      const imports = [sourceImportOf('@company/other', 1), sourceImportOf(TARGET_NAME, 2)];

      const site: ImportSite = {
        file: 'x.ts',
        line: 2,
        specifier: TARGET_NAME,
        text: `import x from '${TARGET_NAME}';`,
        kind: 'static',
        isType: false,
        via: 'name'
      };

      const result = answerOf(importScanOf([scannedFileOf('x.ts', imports)]));

      expect(result).toStrictEqual({ kind: 'found', scanned: 1, skipped: 0, total: 1, sites: [site], limit: null });
    });

    it('WHEN the sites are sent THEN each carries file, line, kind, isType and via as matched', () => {
      const typeImport = sourceImportOf(`${TARGET_NAME}/button`, 4, {
        isType: true,
        kind: 'reexport',
        text: 'export type { B } from "x";'
      });
      const dynamicImport = sourceImportOf('../../b/src/x', 7, { kind: 'dynamic', text: 'await import("../../b/src/x");' });
      const files = [scannedFileOf('src/y.ts', [dynamicImport]), scannedFileOf('src/x.ts', [typeImport])];

      const result = answerOf(importScanOf(files));

      expect(foundSitesOf(result)).toStrictEqual([
        {
          file: 'src/x.ts',
          line: 4,
          specifier: `${TARGET_NAME}/button`,
          text: 'export type { B } from "x";',
          kind: 'reexport',
          isType: true,
          via: 'name'
        },
        {
          file: 'src/y.ts',
          line: 7,
          specifier: '../../b/src/x',
          text: 'await import("../../b/src/x");',
          kind: 'dynamic',
          isType: false,
          via: 'relative'
        }
      ]);
      expectTypeOf<SourceImport['kind']>().toEqualTypeOf<ImportKind>();
      expectTypeOf<ImportScanLimit>().toEqualTypeOf<ImportLimit>();
    });
  });

  describe('GIVEN a scan whose tsconfig paths map @ui/* into B', () => {
    it('WHEN src/a.ts imports @ui/x THEN one site with via alias is sent and total is 1', () => {
      const tsconfigPaths = tsconfigPathsOf({ '@ui/*': ['packages/b/src/*'] });
      const files = [scannedFileOf('src/a.ts', [sourceImportOf('@ui/x', 3)])];
      const sites = [{ file: 'src/a.ts', line: 3, via: 'alias' }];
      const expected = { kind: 'found', total: 1, sites };

      const result = answerOf(importScanOf(files, { tsconfigPaths }));

      expect(result).toMatchObject(expected);
    });
  });

  describe('GIVEN the frozen scan', () => {
    it('WHEN answered THEN it does not throw', () => {
      const scan = frozenScanOf(importScanOf([matchedFileOf('z.ts', 9, 2), matchedFileOf('a.ts', 7, 1)]));

      expect(() => answerImports(scan, IMPORT_EDGE_STUB)).not.toThrow();
    });
  });

  describe('GIVEN cuts (D13)', () => {
    it('WHEN a line is \'    import x from "@company/ui";\' THEN text has no leading spaces', () => {
      const site = onlySiteOf(sourceImportOf(TARGET_NAME, 0, { text: `    import x from "${TARGET_NAME}";` }));

      expect(site?.text).toBe(`import x from "${TARGET_NAME}";`);
    });

    it('WHEN a line is 300 chars after trimming THEN text is its first 200 and the ellipsis', () => {
      const site = onlySiteOf(sourceImportOf(TARGET_NAME, 0, { text: `  ${'q'.repeat(300)}` }));

      expect(site?.text).toBe(`${'q'.repeat(ENTRY_TEXT_MAX)}${ELLIPSIS}`);
    });

    it('WHEN the specifier is @company/ui/ + 250 chars THEN specifier is cut to 200 and the ellipsis', () => {
      const specifier = `${TARGET_NAME}/${'p'.repeat(250)}`;

      const site = onlySiteOf(sourceImportOf(specifier, 0));

      expect(site?.specifier).toBe(`${specifier.slice(0, ENTRY_TEXT_MAX)}${ELLIPSIS}`);
    });

    it('WHEN a line holds U+202E THEN text shows U+FFFD there', () => {
      const site = onlySiteOf(
        sourceImportOf(TARGET_NAME, 0, { text: `import ${String.fromCodePoint(0x202e)}x from '${TARGET_NAME}';` })
      );

      expect(site?.text).toBe(`import ${SHOWN}x from '${TARGET_NAME}';`);
    });
  });

  describe('GIVEN no match', () => {
    it("WHEN no import names B THEN it is { kind: 'none', scanned, skipped, limit } of the scan", () => {
      const files = [scannedFileOf('x.ts', [sourceImportOf('@company/other', 1)]), scannedFileOf('y.ts', [sourceImportOf('./z', 2)])];

      const result = answerOf(importScanOf(files, { scanned: 5, skipped: 2, limit: 'files' }));

      expect(result).toStrictEqual({ kind: 'none', scanned: 5, skipped: 2, limit: 'files' });
    });

    it('WHEN the scan has no files THEN it is none with the scan counts', () => {
      const result = answerOf(importScanOf([], { scanned: 3, skipped: 1 }));

      expect(result).toStrictEqual({ kind: 'none', scanned: 3, skipped: 1, limit: null });
    });
  });

  describe('GIVEN a scan that stopped early', () => {
    it.each(LIMITS)('WHEN the scan stopped at %s THEN found carries that limit', (limit) => {
      const result = answerOf(importScanOf([matchedFileOf('x.ts', 1)], { limit }));

      expect(result).toMatchObject({ kind: 'found', limit });
    });

    it("WHEN the scan stopped at time and nothing matched THEN none carries limit 'time'", () => {
      const result = answerOf(importScanOf([], { limit: 'time' }));

      expect(result).toStrictEqual({ kind: 'none', scanned: 0, skipped: 0, limit: 'time' });
    });
  });
});
