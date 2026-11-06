import { appendFile, chmod, lstat, mkdtemp, rm, symlink, unlink, utimes, writeFile } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { scanFile } from './import-file-scan.ts';
import type { CachedFile, SourceImport } from '../common/import-scan.type.ts';
import type { FileOutcome, WalkedFile } from '../common/import-walk.type.ts';
import { CACHED_FILE_STUB } from '../test/stubs/import-scan.stub.ts';
import { writeImportTree } from '../test/utils/import-tree.spec.util.ts';

/** chmod has no effect on Windows, and root reads any file. */
const reads = vi.hoisted(() => {
  const proceed = async (): Promise<void> => Promise.resolve();
  const beforeOpen: (path: string) => Promise<void> = proceed;
  const state = { beforeOpen, proceed };

  return state;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();

  /** Runs `reads.beforeOpen` before the real open. */
  const open = async (...args: Parameters<typeof real.open>): Promise<fsPromises.FileHandle> => {
    await reads.beforeOpen(String(args[0]));

    return real.open(...args);
  };

  const mocked = { ...real, open };

  return mocked;
});

const CAN_DENY_READ = process.platform !== 'win32' && process.getuid?.() !== 0;

const CAN_SYMLINK = process.platform !== 'win32';

const MAX_BYTES = 64;

const DATE_LATER = new Date('2026-01-01T00:01:00Z');

const IMPORT_A = "import a from 'A';";

const IMPORT_B = "import b from 'B';";

const STATIC_A: SourceImport = { specifier: 'A', kind: 'static', isType: false, line: 0, text: IMPORT_A };

const STATIC_B: SourceImport = { specifier: 'B', kind: 'static', isType: false, line: 0, text: IMPORT_B };

describe('FEATURE: scan one source file', () => {
  let dir = '';
  let walked: WalkedFile = { file: 'a.ts', path: '' };

  const cachedOf = (outcome: FileOutcome): CachedFile => {
    if (outcome.kind !== 'scanned') throw new Error(`expected scanned, got ${outcome.kind}`);

    return outcome.cached;
  };

  const statOf = async (): Promise<CachedFile> => {
    const stats = await lstat(walked.path);
    const known: CachedFile = { mtimeMs: stats.mtimeMs, size: stats.size, imports: [] };

    return known;
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'import-scan-'));
    walked = { file: 'a.ts', path: join(dir, 'a.ts') };
    reads.beforeOpen = reads.proceed;
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe('GIVEN a.ts holding one static import', () => {
    beforeEach(async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_A });
    });

    it("WHEN scanned with no known entry THEN it is scanned with that import and the file's lstat mtimeMs and size", async () => {
      const stats = await statOf();
      const cached: CachedFile = { mtimeMs: stats.mtimeMs, size: stats.size, imports: [STATIC_A] };

      const outcome = await scanFile(walked, undefined, MAX_BYTES);

      expect(outcome).toStrictEqual({ kind: 'scanned', cached });
    });

    it('WHEN scanned with a known entry of equal mtimeMs and size THEN cached is the known object', async () => {
      const stats = await statOf();
      const known: CachedFile = { ...stats, imports: [STATIC_B] };

      const outcome = await scanFile(walked, known, MAX_BYTES);
      const cached = cachedOf(outcome);

      expect(cached).toBe(known);
    });

    it('WHEN scanned with a known entry whose size differs THEN the file is re-read', async () => {
      const stats = await statOf();
      const known: CachedFile = { mtimeMs: stats.mtimeMs, size: stats.size + 1, imports: [STATIC_B] };

      const outcome = await scanFile(walked, known, MAX_BYTES);
      const cached = cachedOf(outcome);

      expect(cached.imports).toStrictEqual([STATIC_A]);
    });

    it('WHEN scanned with a known entry whose mtimeMs differs THEN the file is re-read', async () => {
      const stats = await statOf();
      const known: CachedFile = { mtimeMs: stats.mtimeMs + 1, size: stats.size, imports: [STATIC_B] };

      const outcome = await scanFile(walked, known, MAX_BYTES);
      const cached = cachedOf(outcome);

      expect(cached.imports).toStrictEqual([STATIC_A]);
    });

    it('WHEN scanned after a rewrite and a later mtime THEN the known entry from before is replaced', async () => {
      const before = await scanFile(walked, undefined, MAX_BYTES);
      const known = cachedOf(before);

      await writeFile(walked.path, IMPORT_B);
      await utimes(walked.path, DATE_LATER, DATE_LATER);

      const outcome = await scanFile(walked, known, MAX_BYTES);
      const cached = cachedOf(outcome);

      expect(cached.imports).toStrictEqual([STATIC_B]);
    });
  });

  describe('GIVEN the size cap', () => {
    it('WHEN a file is exactly maxBytes THEN it is scanned', async () => {
      const padding = ' '.repeat(MAX_BYTES - IMPORT_A.length);

      await writeImportTree(dir, { 'a.ts': `${IMPORT_A}${padding}` });

      const outcome = await scanFile(walked, undefined, MAX_BYTES);

      expect(outcome.kind).toBe('scanned');
    });

    it('WHEN a file is maxBytes + 1 THEN it is skipped', async () => {
      const padding = ' '.repeat(MAX_BYTES - IMPORT_A.length + 1);

      await writeImportTree(dir, { 'a.ts': `${IMPORT_A}${padding}` });

      const outcome = await scanFile(walked, undefined, MAX_BYTES);

      expect(outcome).toStrictEqual({ kind: 'skipped' });
    });

    it('WHEN a maxBytes file grows past maxBytes after its lstat, before its open THEN it is skipped', async () => {
      const padding = ' '.repeat(MAX_BYTES - IMPORT_A.length);

      await writeImportTree(dir, { 'a.ts': `${IMPORT_A}${padding}` });
      reads.beforeOpen = async (path: string): Promise<void> => appendFile(path, ' ');

      const outcome = await scanFile(walked, undefined, MAX_BYTES);

      expect(outcome).toStrictEqual({ kind: 'skipped' });
    });
  });

  describe('GIVEN a file that cannot be scanned', () => {
    it('WHEN the path was deleted after the walk THEN it is skipped', async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_A });
      await unlink(walked.path);

      const outcome = await scanFile(walked, undefined, MAX_BYTES);

      expect(outcome).toStrictEqual({ kind: 'skipped' });
    });

    it.skipIf(!CAN_DENY_READ)('WHEN the file is chmod 000 THEN it is skipped', async () => {
      await writeImportTree(dir, { 'a.ts': IMPORT_A });
      await chmod(walked.path, 0o000);

      const outcome = await scanFile(walked, undefined, MAX_BYTES);

      expect(outcome).toStrictEqual({ kind: 'skipped' });
    });

    it.skipIf(!CAN_SYMLINK)('WHEN the listed path was swapped for a symlink to a real source file THEN it is skipped', async () => {
      await writeImportTree(dir, { 'real.ts': IMPORT_A });
      await symlink(join(dir, 'real.ts'), walked.path);

      const outcome = await scanFile(walked, undefined, MAX_BYTES);

      expect(outcome).toStrictEqual({ kind: 'skipped' });
    });
  });

  describe('GIVEN a file with no imports', () => {
    it('WHEN scanned THEN it is scanned with imports []', async () => {
      await writeImportTree(dir, { 'a.ts': 'export {};\n' });

      const outcome = await scanFile(walked, CACHED_FILE_STUB, MAX_BYTES);
      const cached = cachedOf(outcome);

      expect(cached.imports).toStrictEqual([]);
    });
  });
});
