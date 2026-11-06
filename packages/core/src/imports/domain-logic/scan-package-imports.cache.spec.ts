import { mkdtemp, rm, unlink, utimes, writeFile } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scanPackageImports } from './scan-package-imports.ts';
import type { CachedFile, ImportScanInput, PackageImportScan } from '../common/import-scan.type.ts';
import { ImportFileCache } from '../data-access/import-file-cache.ts';
import { DATE, DATE_LATER } from '../test/common/scan-dates.const.ts';
import { writeImportTree } from '../test/utils/import-tree.spec.util.ts';
import { openedNamesOf } from '../test/utils/opened-names.spec.util.ts';
import { capsOf } from '../test/utils/scan-caps.spec.util.ts';
import { inputOf } from '../test/utils/scan-input.spec.util.ts';

const reads = vi.hoisted(() => {
  const opened: string[] = [];
  const state = { opened };

  return state;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();

  /** Lists each opened path in `reads.opened`. */
  const open = async (...args: Parameters<typeof real.open>): Promise<fsPromises.FileHandle> => {
    reads.opened.push(String(args[0]));

    return real.open(...args);
  };

  const mocked = { ...real, open };

  return mocked;
});

const importOf = (specifier: string): string => `import x from '${specifier}';`;

const specifiersOf = (scan: PackageImportScan): string[] => scan.files.flatMap((entry) => entry.imports.map((site) => site.specifier));

describe('FEATURE: rescans use the stat-checked cache', () => {
  let dir = '';
  let input: ImportScanInput = inputOf('', new ImportFileCache());

  const fixAt = async (name: string, text: string, date: Date): Promise<void> => {
    const path = join(dir, name);

    await writeFile(path, text);
    await utimes(path, date, date);
  };

  const openedNames = (): string[] => openedNamesOf(reads.opened, dir);

  const cachedNamesOf = (scanned: string): string[] => {
    const files = input.cache.filesOf(scanned);

    const names = files.keys();

    return Array.from(names);
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'import-scan-'));
    input = inputOf(dir, new ImportFileCache());
    reads.opened.length = 0;
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('GIVEN a finished scan of a.ts (A1) and b.ts (B1), both at DATE', () => {
    let first: PackageImportScan = { files: [], tsconfigPaths: null, scanned: 0, skipped: 0, limit: null };

    beforeEach(async () => {
      await fixAt('a.ts', importOf('A1'), DATE);
      await fixAt('b.ts', importOf('B1'), DATE);

      first = await scanPackageImports(input);
      reads.opened.length = 0;
    });

    it('WHEN rescanned with no change THEN none of its files is opened', async () => {
      await scanPackageImports(input);

      const opened = openedNames();

      expect(opened).toStrictEqual([]);
    });

    it('WHEN rescanned with no change THEN the result equals the first', async () => {
      const second = await scanPackageImports(input);

      expect(second).toStrictEqual(first);
    });

    it('WHEN a.ts is rewritten to the same length and set back to its old mtime THEN the specifier is still A1', async () => {
      await fixAt('a.ts', importOf('A2'), DATE);

      const second = await scanPackageImports(input);
      const specifiers = specifiersOf(second);

      expect(specifiers).toStrictEqual(['A1', 'B1']);
    });

    it('WHEN a.ts is rewritten to a new length at its old mtime THEN a.ts alone is opened again', async () => {
      await fixAt('a.ts', importOf('A22'), DATE);

      await scanPackageImports(input);

      const opened = openedNames();

      expect(opened).toStrictEqual(['a.ts']);
    });

    it('WHEN a.ts is rewritten to a new length at its old mtime THEN its new specifier is listed', async () => {
      await fixAt('a.ts', importOf('A22'), DATE);

      const second = await scanPackageImports(input);
      const specifiers = specifiersOf(second);

      expect(specifiers).toStrictEqual(['A22', 'B1']);
    });

    it('WHEN a.ts is touched to a new mtime with the same text THEN a.ts alone is opened again', async () => {
      await utimes(join(dir, 'a.ts'), DATE_LATER, DATE_LATER);

      await scanPackageImports(input);

      const opened = openedNames();

      expect(opened).toStrictEqual(['a.ts']);
    });

    it('WHEN b.ts is deleted THEN the cache has no b.ts', async () => {
      await unlink(join(dir, 'b.ts'));

      await scanPackageImports(input);

      const cached = cachedNamesOf(dir);

      expect(cached).toStrictEqual(['a.ts']);
    });
  });

  describe('GIVEN a finished scan of a.ts, b.ts, c.ts, then a.ts touched and a rescan the clock stops once a.ts opens', () => {
    beforeEach(async () => {
      await writeImportTree(dir, { 'a.ts': importOf('A'), 'b.ts': importOf('B'), 'c.ts': importOf('C') });
      await scanPackageImports(input);
      await utimes(join(dir, 'a.ts'), DATE_LATER, DATE_LATER);
      reads.opened.length = 0;

      const caps = capsOf({ reads: 1 });
      const now = (): number => (reads.opened.length > 0 ? caps.timeMs : 0);

      await scanPackageImports(inputOf(dir, input.cache, { caps, now }));
      reads.opened.length = 0;
    });

    it('WHEN rescanned again THEN no file is opened', async () => {
      await scanPackageImports(input);

      const opened = openedNames();

      expect(opened).toStrictEqual([]);
    });
  });

  describe('GIVEN a scan stopped by caps.files 2 over three files', () => {
    it('WHEN rescanned with default caps THEN only the file past the stop is opened', async () => {
      await writeImportTree(dir, { 'a.ts': importOf('A'), 'b.ts': importOf('B'), 'c.ts': importOf('C') });
      const stopped = inputOf(dir, input.cache, { caps: capsOf({ files: 2 }) });

      await scanPackageImports(stopped);
      reads.opened.length = 0;

      await scanPackageImports(input);

      const opened = openedNames();

      expect(opened).toStrictEqual(['c.ts']);
    });
  });

  describe('GIVEN packages/a scanned, then the root scanned with packages/a in skipDirs', () => {
    let packageDir = '';
    let first: ReadonlyMap<string, CachedFile> = new Map();

    beforeEach(async () => {
      await writeImportTree(dir, { 'packages/a/a.ts': importOf('A'), 'r.ts': importOf('R') });
      packageDir = join(dir, 'packages', 'a');

      await scanPackageImports(inputOf(packageDir, input.cache));

      first = input.cache.filesOf(packageDir);

      await scanPackageImports({ ...input, skipDirs: new Set([packageDir]) });
    });

    it('WHEN the cache is read THEN it keeps the same map for packages/a', () => {
      const kept = input.cache.filesOf(packageDir);

      expect(kept).toBe(first);
    });

    it('WHEN the cache is read THEN the root map holds r.ts only', () => {
      const cached = cachedNamesOf(dir);

      expect(cached).toStrictEqual(['r.ts']);
    });
  });
});
