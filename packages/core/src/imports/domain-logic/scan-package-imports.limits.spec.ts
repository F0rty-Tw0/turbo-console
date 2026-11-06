import { mkdtemp, rm } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scanPackageImports } from './scan-package-imports.ts';
import type { ImportScanInput, PackageImportScan } from '../common/import-scan.type.ts';
import { ImportFileCache } from '../data-access/import-file-cache.ts';
import { writeImportTree } from '../test/utils/import-tree.spec.util.ts';
import { onOpenOf } from '../test/utils/on-open.spec.util.ts';
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

describe('FEATURE: stop a package import scan at the D8 limits', () => {
  let dir = '';
  let scan: PackageImportScan = { files: [], tsconfigPaths: null, scanned: 0, skipped: 0, limit: null };
  let cached: string[] = [];

  /** Scans `dir` with `patch` over a fresh cache, keeping the result and the cached file names. */
  const scanWith = async (patch: Partial<ImportScanInput>): Promise<void> => {
    const input = inputOf(dir, new ImportFileCache(), patch);

    scan = await scanPackageImports(input);

    const files = input.cache.filesOf(dir);

    cached = Array.from(files.keys());
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'import-scan-'));
    reads.opened.length = 0;
    reads.beforeOpen = reads.proceed;
    reads.inFlight = 0;
    reads.maxInFlight = 0;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

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

  it('WHEN the wall clock jumps a day ahead mid-scan THEN the default clock hits no time limit', async () => {
    await writeImportTree(dir, { 'a.ts': IMPORT_B });
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValue(86_400_000);

    await scanWith({});

    expect(scan.limit).toBeNull();
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
