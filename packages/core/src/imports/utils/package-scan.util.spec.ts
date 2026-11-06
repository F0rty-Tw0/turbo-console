import { describe, expect, it } from 'vitest';

import { packageScanOf } from './package-scan.util.ts';
import type { CachedFile } from '../common/import-scan.type.ts';
import type { FileOutcome, ImportWalk, WalkedFile } from '../common/import-walk.type.ts';
import { CACHED_FILE_STUB, SOURCE_IMPORT_STUB } from '../test/stubs/import-scan.stub.ts';

const NO_IMPORTS: CachedFile = { mtimeMs: 2, size: 2, imports: [] };

const walkedOf = (file: string): WalkedFile => {
  const walked: WalkedFile = { file, path: `/dir/${file}` };

  return walked;
};

const withNames = (names: string[]): ImportWalk => {
  const files = names.map(walkedOf);
  const walk: ImportWalk = { files, limit: null };

  return walk;
};

describe('FEATURE: assemble a package scan', () => {
  describe('GIVEN outcomes scanned(1 import), scanned(0 imports), skipped, unreached', () => {
    const walk = withNames(['a.ts', 'b.ts', 'c.ts', 'd.ts']);
    const outcomes: FileOutcome[] = [
      { kind: 'scanned', cached: CACHED_FILE_STUB },
      { kind: 'scanned', cached: NO_IMPORTS },
      { kind: 'skipped' },
      { kind: 'unreached' }
    ];

    it('WHEN assembled THEN files lists only the file with imports, scanned is 2, skipped 1, tsconfigPaths null', () => {
      const listed = [{ file: 'a.ts', imports: [SOURCE_IMPORT_STUB] }];

      const { scan } = packageScanOf(walk, outcomes, null);

      expect(scan).toStrictEqual({
        files: listed,
        tsconfigPaths: null,
        scanned: 2,
        skipped: 1,
        limit: null
      });
    });

    it('WHEN assembled THEN cached holds the two scanned files only, keyed by file', () => {
      const { cached } = packageScanOf(walk, outcomes, null);

      const pairs = cached.entries();
      const entries = Array.from(pairs);

      expect(entries).toStrictEqual([
        ['a.ts', CACHED_FILE_STUB],
        ['b.ts', NO_IMPORTS]
      ]);
    });
  });

  describe('GIVEN walk order c, a, b, all scanned', () => {
    it('WHEN assembled THEN files keep walk order', () => {
      const walk = withNames(['c.ts', 'a.ts', 'b.ts']);
      const scanned: FileOutcome = { kind: 'scanned', cached: CACHED_FILE_STUB };

      const { scan } = packageScanOf(walk, [scanned, scanned, scanned], null);
      const listed = scan.files.map((entry) => entry.file);

      expect(listed).toStrictEqual(['c.ts', 'a.ts', 'b.ts']);
    });
  });

  describe("GIVEN limit 'time'", () => {
    it("WHEN assembled THEN scan.limit is 'time'", () => {
      const { scan } = packageScanOf(withNames([]), [], 'time');

      expect(scan.limit).toBe('time');
    });
  });
});
