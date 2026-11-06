import { mkdtemp, rm, utimes } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scanPackageImports } from './scan-package-imports.ts';
import type { PackageImportScan, SourceImport } from '../common/import-scan.type.ts';
import { ImportFileCache } from '../data-access/import-file-cache.ts';
import { DATE, DATE_LATER } from '../test/common/scan-dates.const.ts';
import { writeImportTree } from '../test/utils/import-tree.spec.util.ts';
import { openedNamesOf } from '../test/utils/opened-names.spec.util.ts';
import { capsOf } from '../test/utils/scan-caps.spec.util.ts';
import { inputOf } from '../test/utils/scan-input.spec.util.ts';

const reads = vi.hoisted(() => {
  const proceed = async (): Promise<void> => Promise.resolve();
  const beforeOpen: (path: string) => Promise<void> = proceed;
  const opened: string[] = [];
  const state = { beforeOpen, proceed, opened, inFlight: 0, maxInFlight: 0 };

  return state;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();

  /** Lists each opened path, runs `reads.beforeOpen` first, and counts opens still unclosed in `reads.maxInFlight`. */
  const open = async (...args: Parameters<typeof real.open>): Promise<fsPromises.FileHandle> => {
    reads.opened.push(String(args[0]));
    reads.inFlight += 1;
    reads.maxInFlight = Math.max(reads.maxInFlight, reads.inFlight);

    await reads.beforeOpen(String(args[0]));

    const handle = await real.open(...args);
    const close = handle.close.bind(handle);
    const countedClose = async (): Promise<void> => {
      await close();
      reads.inFlight -= 1;
    };

    handle.close = countedClose;

    return handle;
  };

  const mocked = { ...real, open };

  return mocked;
});

const IMPORT_B = "import b from 'B';";

const STATIC_B: SourceImport = { specifier: 'B', kind: 'static', isType: false, line: 0, text: IMPORT_B };

const onOpenOf = (suffix: string, action: () => void): ((path: string) => Promise<void>) => {
  const hook = async (path: string): Promise<void> => {
    const isTarget = path.endsWith(suffix);

    if (isTarget) action();

    return Promise.resolve();
  };

  return hook;
};

const filesOf = (scan: PackageImportScan): string[] => scan.files.map((entry) => entry.file);

describe('FEATURE: scan one package for its imports', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'import-scan-'));
    reads.opened.length = 0;
    reads.beforeOpen = reads.proceed;
    reads.inFlight = 0;
    reads.maxInFlight = 0;
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('GIVEN src/a.ts importing B and an import-free src/b.ts', () => {
    it('WHEN scanned THEN only a.ts is listed, both are scanned, and tsconfigPaths is null', async () => {
      await writeImportTree(dir, { 'src/a.ts': IMPORT_B, 'src/b.ts': 'export {};\n' });

      const scan = await scanPackageImports(inputOf(dir, new ImportFileCache()));

      const listed = [{ file: 'src/a.ts', imports: [STATIC_B] }];

      expect(scan).toStrictEqual({
        files: listed,
        tsconfigPaths: null,
        scanned: 2,
        skipped: 0,
        limit: null
      });
    });
  });

  it('GIVEN node_modules/x/index.ts importing B WHEN scanned THEN that file is not listed', async () => {
    await writeImportTree(dir, { 'node_modules/x/index.ts': IMPORT_B, 'a.ts': IMPORT_B });

    const scan = await scanPackageImports(inputOf(dir, new ImportFileCache()));

    expect(filesOf(scan)).toStrictEqual(['a.ts']);
  });

  it('GIVEN packages/a holds a.ts and the root holds r.ts WHEN the root is scanned with packages/a in skipDirs THEN only r.ts is listed', async () => {
    await writeImportTree(dir, { 'packages/a/a.ts': IMPORT_B, 'r.ts': IMPORT_B });
    const skipDirs = new Set([join(dir, 'packages', 'a')]);

    const scan = await scanPackageImports(inputOf(dir, new ImportFileCache(), { skipDirs }));

    expect(filesOf(scan)).toStrictEqual(['r.ts']);
  });

  it('GIVEN a finished scan, then dir removed WHEN scanned again THEN it rejects with ENOENT and the cache keeps its first map', async () => {
    await writeImportTree(dir, { 'a.ts': IMPORT_B });
    const input = inputOf(dir, new ImportFileCache());

    await scanPackageImports(input);

    const first = input.cache.filesOf(dir);

    await rm(dir, { recursive: true, force: true });

    await expect(scanPackageImports(input)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(input.cache.filesOf(dir)).toBe(first);
  });

  describe('GIVEN the D8 limits', () => {
    it("WHEN caps.files is 2 over three files THEN two are scanned, limit is 'files' and the cache holds those two", async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_B, 'b.ts': IMPORT_B, 'c.ts': IMPORT_B });
      const input = inputOf(dir, new ImportFileCache(), { caps: capsOf({ files: 2 }) });

      const scan = await scanPackageImports(input);
      const cached = Array.from(input.cache.filesOf(dir).keys());

      expect([scan.scanned, scan.limit, cached]).toStrictEqual([2, 'files', ['a.ts', 'b.ts']]);
    });

    it("WHEN caps.entries is 2 over a.ts, b.png, c.ts THEN one is scanned and limit is 'entries'", async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_B, 'b.png': '', 'c.ts': IMPORT_B });

      const scan = await scanPackageImports(inputOf(dir, new ImportFileCache(), { caps: capsOf({ entries: 2 }) }));

      expect([scan.scanned, scan.limit]).toStrictEqual([1, 'entries']);
    });

    it("WHEN caps.reads is 1 and the clock passes timeMs as b.ts opens THEN two are scanned, limit is 'time' and the cache holds both", async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_B, 'b.ts': IMPORT_B, 'c.ts': IMPORT_B });
      let nowMs = 0;
      const now = (): number => nowMs;
      const caps = capsOf({ reads: 1 });
      const input = inputOf(dir, new ImportFileCache(), { caps, now });

      reads.beforeOpen = onOpenOf('b.ts', () => {
        nowMs = caps.timeMs;
      });

      const scan = await scanPackageImports(input);
      const cached = Array.from(input.cache.filesOf(dir).keys());

      expect([scan.scanned, scan.limit, cached]).toStrictEqual([2, 'time', ['a.ts', 'b.ts']]);
    });

    it('WHEN caps.fileBytes is 64 over a 64-byte a.ts and a 65-byte b.ts THEN one is scanned, one skipped and b.ts is never opened', async () => {
      const fit = IMPORT_B.padEnd(64);

      await writeImportTree(dir, { 'a.ts': fit, 'b.ts': `${fit} ` });

      const scan = await scanPackageImports(inputOf(dir, new ImportFileCache(), { caps: capsOf({ fileBytes: 64 }) }));
      const opened = openedNamesOf(reads.opened, dir);

      expect([scan.scanned, scan.skipped, opened]).toStrictEqual([1, 1, ['a.ts']]);
    });

    it('WHEN caps.reads is 2 over six files whose opens wait a tick THEN two are in flight at most', async () => {
      const names = ['a', 'b', 'c', 'd', 'e', 'f'];

      await writeImportTree(dir, Object.fromEntries(names.map((name) => [`${name}.ts`, IMPORT_B])));
      reads.beforeOpen = async (): Promise<void> => delay(5);

      await scanPackageImports(inputOf(dir, new ImportFileCache(), { caps: capsOf({ reads: 2 }) }));

      expect(reads.maxInFlight).toBe(2);
    });

    it("WHEN caps.files is 2 and the clock passes timeMs as a.ts opens THEN one is scanned and limit is 'files'", async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_B, 'b.ts': IMPORT_B, 'c.ts': IMPORT_B });
      let nowMs = 0;
      const now = (): number => nowMs;
      const caps = capsOf({ files: 2, reads: 1 });

      reads.beforeOpen = onOpenOf('a.ts', () => {
        nowMs = caps.timeMs;
      });

      const scan = await scanPackageImports(inputOf(dir, new ImportFileCache(), { caps, now }));

      expect([scan.scanned, scan.limit]).toStrictEqual([1, 'files']);
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
  });
});
