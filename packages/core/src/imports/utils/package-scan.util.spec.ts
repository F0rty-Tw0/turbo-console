import { describe, expect, expectTypeOf, it } from 'vitest';

import { packageScanOf } from './package-scan.util.ts';
import type { CachedFile, TsconfigPaths } from '../common/import-scan.type.ts';
import type { FileOutcome, ImportWalk, WalkedFile } from '../common/import-walk.type.ts';
import { CACHED_FILE_STUB, SOURCE_IMPORT_STUB } from '../test/stubs/import-scan.stub.ts';

const NO_IMPORTS: CachedFile = { mtimeMs: 2, size: 2, imports: [] };

const NO_CACHE = new Map<string, CachedFile>();

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

      const { scan } = packageScanOf(walk, outcomes, null, NO_CACHE);

      expect(scan).toStrictEqual({
        files: listed,
        tsconfigPaths: null,
        scanned: 2,
        skipped: 1,
        limit: null
      });
      expectTypeOf(scan.tsconfigPaths).toEqualTypeOf<TsconfigPaths | null>();
    });

    it('WHEN assembled THEN cached holds the two scanned files only, keyed by file', () => {
      const { cached } = packageScanOf(walk, outcomes, null, NO_CACHE);

      const pairs = cached.entries();
      const entries = Array.from(pairs);

      expect(entries).toStrictEqual([
        ['a.ts', CACHED_FILE_STUB],
        ['b.ts', NO_IMPORTS]
      ]);
    });
  });

  describe('GIVEN a.ts scanned, b.ts unreached, and a previous map holding b.ts and the unwalked z.ts', () => {
    it('WHEN assembled THEN cached holds a.ts and the previous b.ts entry, not z.ts', () => {
      const walk = withNames(['a.ts', 'b.ts']);
      const outcomes: FileOutcome[] = [{ kind: 'scanned', cached: CACHED_FILE_STUB }, { kind: 'unreached' }];
      const previous = new Map([
        ['b.ts', NO_IMPORTS],
        ['z.ts', NO_IMPORTS]
      ]);

      const { cached } = packageScanOf(walk, outcomes, 'time', previous);
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

      const { scan } = packageScanOf(walk, [scanned, scanned, scanned], null, NO_CACHE);
      const listed = scan.files.map((entry) => entry.file);

      expect(listed).toStrictEqual(['c.ts', 'a.ts', 'b.ts']);
    });
  });

  describe("GIVEN limit 'time'", () => {
    it("WHEN assembled THEN scan.limit is 'time'", () => {
      const { scan } = packageScanOf(withNames([]), [], 'time', NO_CACHE);

      expect(scan.limit).toBe('time');
    });
  });
});
