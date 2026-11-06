import { mkdtemp, rm, utimes } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scanPackageImports } from './scan-package-imports.ts';
import type { PackageImportScan, SourceImport } from '../common/import-scan.type.ts';
import { ImportFileCache } from '../data-access/import-file-cache.ts';
import { DATE, DATE_LATER } from '../test/common/scan-dates.const.ts';
import { writeImportTree } from '../test/utils/import-tree.spec.util.ts';
import { onOpenOf } from '../test/utils/on-open.spec.util.ts';
import { openedNamesOf } from '../test/utils/opened-names.spec.util.ts';
import { capsOf } from '../test/utils/scan-caps.spec.util.ts';
import { inputOf } from '../test/utils/scan-input.spec.util.ts';

const reads = vi.hoisted(() => {
  const proceed = async (): Promise<void> => Promise.resolve();
  const beforeOpen: (path: string) => Promise<void> = proceed;
  const opened: string[] = [];
  const state = { beforeOpen, proceed, opened };

  return state;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();

  /** Lists each opened path and runs `reads.beforeOpen` before the real open. */
  const open = async (...args: Parameters<typeof real.open>): Promise<fsPromises.FileHandle> => {
    reads.opened.push(String(args[0]));

    await reads.beforeOpen(String(args[0]));

    return real.open(...args);
  };

  const mocked = { ...real, open };

  return mocked;
});

const IMPORT_B = "import b from 'B';";

const STATIC_B: SourceImport = { specifier: 'B', kind: 'static', isType: false, line: 0, text: IMPORT_B };

const filesOf = (scan: PackageImportScan): string[] => scan.files.map((entry) => entry.file);

describe('FEATURE: scan one package for its imports', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'import-scan-'));
    reads.opened.length = 0;
    reads.beforeOpen = reads.proceed;
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('GIVEN src/a.ts importing B and an import-free src/b.ts', () => {
    it('WHEN scanned THEN only a.ts is listed, both are scanned, and tsconfigPaths is null', async () => {
      await writeImportTree(dir, { 'src/a.ts': IMPORT_B, 'src/b.ts': 'export {};\n' });
      const listed = [{ file: 'src/a.ts', imports: [STATIC_B] }];

      const scan = await scanPackageImports(inputOf(dir, new ImportFileCache()));

      expect(scan).toStrictEqual({ files: listed, tsconfigPaths: null, scanned: 2, skipped: 0, limit: null });
    });
  });

  describe('GIVEN node_modules/x/index.ts and a.ts, both importing B', () => {
    it('WHEN scanned THEN only a.ts is listed', async () => {
      await writeImportTree(dir, { 'node_modules/x/index.ts': IMPORT_B, 'a.ts': IMPORT_B });

      const scan = await scanPackageImports(inputOf(dir, new ImportFileCache()));
      const listed = filesOf(scan);

      expect(listed).toStrictEqual(['a.ts']);
    });
  });

  describe('GIVEN packages/a holds a.ts and the root holds r.ts', () => {
    it('WHEN the root is scanned with packages/a in skipDirs THEN only r.ts is listed', async () => {
      await writeImportTree(dir, { 'packages/a/a.ts': IMPORT_B, 'r.ts': IMPORT_B });
      const skipDirs = new Set([join(dir, 'packages', 'a')]);

      const scan = await scanPackageImports(inputOf(dir, new ImportFileCache(), { skipDirs }));
      const listed = filesOf(scan);

      expect(listed).toStrictEqual(['r.ts']);
    });
  });

  describe('GIVEN a finished scan, then dir removed', () => {
    it('WHEN scanned again THEN it rejects with ENOENT and the cache keeps its first map', async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_B });
      const input = inputOf(dir, new ImportFileCache());

      await scanPackageImports(input);

      const first = input.cache.filesOf(dir);

      await rm(dir, { recursive: true, force: true });

      await expect(scanPackageImports(input)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(input.cache.filesOf(dir)).toBe(first);
    });
  });

  describe('GIVEN an abort', () => {
    it('WHEN the signal is aborted before the scan THEN it rejects with signal.reason and nothing is opened', async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_B });
      const reason = new Error('stop');
      const signal = AbortSignal.abort(reason);

      await expect(scanPackageImports(inputOf(dir, new ImportFileCache(), { signal }))).rejects.toBe(reason);
      expect(reads.opened).toStrictEqual([]);
    });

    it('WHEN a rescan is aborted as the changed b.ts opens THEN it rejects with signal.reason and the cache keeps its first map', async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_B, 'b.ts': IMPORT_B });
      await utimes(join(dir, 'a.ts'), DATE, DATE);
      await utimes(join(dir, 'b.ts'), DATE, DATE);
      const input = inputOf(dir, new ImportFileCache());

      await scanPackageImports(input);

      const first = input.cache.filesOf(dir);
      const controller = new AbortController();
      const reason = new Error('stop');

      await utimes(join(dir, 'b.ts'), DATE_LATER, DATE_LATER);
      reads.beforeOpen = onOpenOf('b.ts', () => {
        controller.abort(reason);
      });

      await expect(scanPackageImports({ ...input, signal: controller.signal })).rejects.toBe(reason);
      expect(input.cache.filesOf(dir)).toBe(first);
    });

    describe('GIVEN caps.reads 1 over a.ts, b.ts, c.ts and an abort as a.ts opens', () => {
      const reason = new Error('stop');
      let rejection: unknown = null;

      beforeEach(async () => {
        await writeImportTree(dir, { 'a.ts': IMPORT_B, 'b.ts': IMPORT_B, 'c.ts': IMPORT_B });
        const controller = new AbortController();

        reads.beforeOpen = onOpenOf('a.ts', () => {
          controller.abort(reason);
        });

        const scanning = scanPackageImports(
          inputOf(dir, new ImportFileCache(), { caps: capsOf({ reads: 1 }), signal: controller.signal })
        );

        rejection = await scanning.catch((error: unknown) => error);
      });

      it('WHEN scanned THEN it rejects with signal.reason', () => {
        expect(rejection).toBe(reason);
      });

      it('WHEN scanned THEN only a.ts is opened', () => {
        const opened = openedNamesOf(reads.opened, dir);

        expect(opened).toStrictEqual(['a.ts']);
      });
    });
  });
});
