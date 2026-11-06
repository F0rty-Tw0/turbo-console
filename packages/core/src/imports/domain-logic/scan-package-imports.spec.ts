import { mkdtemp, rm, utimes } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scanPackageImports } from './scan-package-imports.ts';
import type { ImportScanInput, PackageImportScan, SourceImport } from '../common/import-scan.type.ts';
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
      const listed = [{ file: 'src/a.ts', imports: [STATIC_B] }];

      const scan = await scanPackageImports(inputOf(dir, new ImportFileCache()));

      expect(scan).toStrictEqual({
        files: listed,
        tsconfigPaths: null,
        scanned: 2,
        skipped: 0,
        limit: null
      });
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

  describe('GIVEN the D8 limits', () => {
    let scan: PackageImportScan = { files: [], tsconfigPaths: null, scanned: 0, skipped: 0, limit: null };
    let cached: string[] = [];

    /** Scans `dir` with `patch` over a fresh cache, keeping the result and the cached file names. */
    const scanWith = async (patch: Partial<ImportScanInput>): Promise<void> => {
      const input = inputOf(dir, new ImportFileCache(), patch);

      scan = await scanPackageImports(input);

      const files = input.cache.filesOf(dir);

      cached = Array.from(files.keys());
    };

    describe('GIVEN caps.files 2 over three files', () => {
      beforeEach(async () => {
        await writeImportTree(dir, { 'a.ts': IMPORT_B, 'b.ts': IMPORT_B, 'c.ts': IMPORT_B });
        await scanWith({ caps: capsOf({ files: 2 }) });
      });

      it('WHEN scanned THEN two are scanned', () => {
        expect(scan.scanned).toBe(2);
      });

      it("WHEN scanned THEN limit is 'files'", () => {
        expect(scan.limit).toBe('files');
      });

      it('WHEN scanned THEN the cache holds those two', () => {
        expect(cached).toStrictEqual(['a.ts', 'b.ts']);
      });
    });

    describe('GIVEN caps.entries 2 over a.ts, b.png, c.ts', () => {
      beforeEach(async () => {
        await writeImportTree(dir, { 'a.ts': IMPORT_B, 'b.png': '', 'c.ts': IMPORT_B });
        await scanWith({ caps: capsOf({ entries: 2 }) });
      });

      it('WHEN scanned THEN one is scanned', () => {
        expect(scan.scanned).toBe(1);
      });

      it("WHEN scanned THEN limit is 'entries'", () => {
        expect(scan.limit).toBe('entries');
      });
    });

    describe('GIVEN caps.reads 1 and a clock that passes timeMs as b.ts opens', () => {
      beforeEach(async () => {
        await writeImportTree(dir, { 'a.ts': IMPORT_B, 'b.ts': IMPORT_B, 'c.ts': IMPORT_B });
        let nowMs = 0;
        const caps = capsOf({ reads: 1 });

        reads.beforeOpen = onOpenOf('b.ts', () => {
          nowMs = caps.timeMs;
        });
        await scanWith({ caps, now: () => nowMs });
      });

      it('WHEN scanned THEN two are scanned', () => {
        expect(scan.scanned).toBe(2);
      });

      it("WHEN scanned THEN limit is 'time'", () => {
        expect(scan.limit).toBe('time');
      });

      it('WHEN scanned THEN the cache holds both', () => {
        expect(cached).toStrictEqual(['a.ts', 'b.ts']);
      });
    });

    describe('GIVEN caps.fileBytes 64 over a 64-byte a.ts and a 65-byte b.ts', () => {
      beforeEach(async () => {
        const fit = IMPORT_B.padEnd(64);

        await writeImportTree(dir, { 'a.ts': fit, 'b.ts': `${fit} ` });
        await scanWith({ caps: capsOf({ fileBytes: 64 }) });
      });

      it('WHEN scanned THEN one is scanned', () => {
        expect(scan.scanned).toBe(1);
      });

      it('WHEN scanned THEN one is skipped', () => {
        expect(scan.skipped).toBe(1);
      });

      it('WHEN scanned THEN b.ts is never opened', () => {
        const opened = openedNamesOf(reads.opened, dir);

        expect(opened).toStrictEqual(['a.ts']);
      });
    });

    it('WHEN caps.reads is 2 over six files whose opens wait a tick THEN two are in flight at most', async () => {
      const names = ['a', 'b', 'c', 'd', 'e', 'f'];

      await writeImportTree(dir, Object.fromEntries(names.map((name) => [`${name}.ts`, IMPORT_B])));
      reads.beforeOpen = async (): Promise<void> => delay(5);

      await scanPackageImports(inputOf(dir, new ImportFileCache(), { caps: capsOf({ reads: 2 }) }));

      expect(reads.maxInFlight).toBe(2);
    });

    describe('GIVEN caps.files 2, caps.reads 1 and a clock that passes timeMs as a.ts opens', () => {
      beforeEach(async () => {
        await writeImportTree(dir, { 'a.ts': IMPORT_B, 'b.ts': IMPORT_B, 'c.ts': IMPORT_B });
        let nowMs = 0;
        const caps = capsOf({ files: 2, reads: 1 });

        reads.beforeOpen = onOpenOf('a.ts', () => {
          nowMs = caps.timeMs;
        });
        await scanWith({ caps, now: () => nowMs });
      });

      it('WHEN scanned THEN one is scanned', () => {
        expect(scan.scanned).toBe(1);
      });

      it("WHEN scanned THEN limit is 'files'", () => {
        expect(scan.limit).toBe('files');
      });
    });
  });

  describe('GIVEN a wall clock that jumps a day ahead after the scan starts', () => {
    it('WHEN scanned with the default clock THEN no time limit is hit', async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_B });
      const day = 24 * 60 * 60 * 1000;
      const wallClock = vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(day);

      const scan = await scanPackageImports(inputOf(dir, new ImportFileCache()));

      wallClock.mockRestore();

      expect(scan.limit).toBeNull();
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
