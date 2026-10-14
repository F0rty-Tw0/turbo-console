import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, mkdtemp, rm, stat, symlink, utimes, writeFile } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { hashKeyedFiles } from './keyed-files.ts';
import type { KeyedFile } from '../common/cache.type.ts';
import { growOnce } from '../test/utils/file-growth.spec.util.ts';

const reads = vi.hoisted(() => {
  const proceed = async (): Promise<void> => Promise.resolve();
  const beforeOpen: (path: string) => Promise<void> = proceed;
  const beforeRead: (path: string) => Promise<void> = proceed;
  const opened: string[] = [];
  const state = { beforeOpen, beforeRead, proceed, opened };

  return state;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();

  /**
   * Each open path is listed in `reads.opened` and runs `reads.beforeOpen` first, so a case can swap the file after the
   * pre-open stat, and each handle runs `reads.beforeRead` with its path before every read, so a case can edit the file
   * mid-hash.
   */
  const open = async (...args: Parameters<typeof real.open>): Promise<fsPromises.FileHandle> => {
    reads.opened.push(String(args[0]));
    await reads.beforeOpen(String(args[0]));

    const handle = await real.open(...args);
    const read = handle.read.bind(handle);
    const hookedRead = async (...readArgs: unknown[]): Promise<unknown> => {
      await reads.beforeRead(String(args[0]));

      return Reflect.apply(read, handle, readArgs);
    };

    Object.defineProperty(handle, 'read', { value: hookedRead });

    return handle;
  };

  const mocked = { ...real, open };

  return mocked;
});

/** chmod has no effect on Windows, and root reads any file. */
const CAN_DENY_READ = process.platform !== 'win32' && process.getuid?.() !== 0;

/** mkfifo is POSIX only. */
const IS_POSIX = process.platform !== 'win32';

/** `/proc/self/pagemap` is Linux only. */
const IS_LINUX = process.platform === 'linux';

/** Stats as a regular file of size 0, yet reads on for hundreds of GiB: only the byte cap stops its hash. */
const PAGEMAP = '/proc/self/pagemap';

/** Reading 1 MiB past procfs's size 0 takes well under a second; reading on uncapped takes minutes. */
const PAGEMAP_TIMEOUT_MS = 10_000;

/** More than the 16 reads kept in flight, so every worker takes several paths. */
const MANY_FILES = 40;

/** Writing and hashing `MANY_FILES` new files took longer than vitest's 5 s default on a Windows runner once. */
const MANY_FILES_TIMEOUT_MS = 30_000;

/**
 * The in-flight case hashes its own files in this folder and counts only their reads. A timed-out earlier case keeps
 * reading in the background through the shared `reads.beforeRead` hook, and once made the count 27 > 16.
 */
const BURST_DIR = 'burst';

/** `MAX_CONCURRENT_READS` in keyed-files.ts: more open files at once risks EMFILE. */
const MAX_READS_IN_FLIGHT = 16;

const inFlight = { active: 0, peak: 0 };

/** Holds each read of a `BURST_DIR` file for a timer tick and records how many such reads are held at once. */
const countInFlight = async (path: string): Promise<void> => {
  const folder = basename(dirname(path));
  const isBurst = folder === BURST_DIR;

  if (!isBurst) return;

  inFlight.active += 1;
  inFlight.peak = Math.max(inFlight.peak, inFlight.active);
  await delay(1);
  inFlight.active -= 1;
};

/** Three 64 KiB hash chunks and a partial fourth. */
const LARGE_FILE_BYTES = 3 * 64 * 1024 + 7;

/** Under the 1 MiB a read may run past the stat size from the open. */
const SMALL_GROWTH_BYTES = 256 * 1024;

/** Over that 1 MiB slack, yet under the 4 MiB cap of a non-lockfile, so only the slack can stop the read. */
const LARGE_GROWTH_BYTES = 2 * 1024 * 1024;

/** 2001-09-09, in seconds: far from any mtime a fresh temp file gets. */
const EDITED_AT_S = 1_000_000_000;

let root = '';

const sha256Of = (data: string | Buffer): string => {
  const hash = createHash('sha256');

  hash.update(data);

  return hash.digest('hex');
};

const markerFile = (path: string, digest: string): KeyedFile => {
  const file: KeyedFile = { path, digest, mtimeMs: null };

  return file;
};

const manyName = (_: unknown, index: number): string => `many/file-${String(index).padStart(2, '0')}.txt`;

const burstName = (_: unknown, index: number): string => `${BURST_DIR}/file-${String(index).padStart(2, '0')}.txt`;

const writeMany = async (path: string): Promise<void> => writeFile(join(root, path), path);

/** Sets `path`'s mtime to `EDITED_AT_S`, as an edit landing during the read would. */
const touchEdited = async (path: string): Promise<void> => utimes(path, EDITED_AT_S, EDITED_AT_S);

/** Replaces the file named `name` by a FIFO just before its open, after the stat that found it regular. */
const swapForFifo = (name: string): ((path: string) => Promise<void>) => {
  return async (path: string): Promise<void> => {
    const fileName = basename(path);
    const isTarget = fileName === name;

    if (!isTarget) return;

    await rm(path);
    execFileSync('mkfifo', [path]);
  };
};

/** The path and digest `hashKeyedFiles` gives a file written by `writeMany`; its mtime is not compared. */
const hashedAs = (path: string): Partial<KeyedFile> => {
  const digest = sha256Of(path);
  const file: Partial<KeyedFile> = { path, digest };

  return file;
};

describe('FEATURE: keyed file hashing', () => {
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'keyed-files-'));
    await mkdir(join(root, 'many'));
    await mkdir(join(root, BURST_DIR));
    await mkdir(join(root, 'dir'));
    await writeFile(join(root, 'package.json'), '{"name":"root"}');
    await writeFile(join(root, 'empty.txt'), '');
    await writeFile(join(root, 'plain-file'), 'x');
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  afterEach(() => {
    reads.beforeOpen = reads.proceed;
    reads.beforeRead = reads.proceed;
    reads.opened.length = 0;
  });

  describe('GIVEN a present regular file', () => {
    it('WHEN it is hashed THEN its digest is the content sha256 and its mtime is kept', async () => {
      const { mtimeMs } = await stat(join(root, 'package.json'));
      const expected: KeyedFile = { path: 'package.json', digest: sha256Of('{"name":"root"}'), mtimeMs };

      const files = await hashKeyedFiles(root, ['package.json']);

      expect(files).toStrictEqual([expected]);
    });

    it('WHEN it is larger than one read chunk THEN its digest is the sha256 of its full content', async () => {
      const content = Buffer.alloc(LARGE_FILE_BYTES, 'abcdefg');

      await writeFile(join(root, 'large.bin'), content);

      const files = await hashKeyedFiles(root, ['large.bin']);

      expect(files[0]?.digest).toBe(sha256Of(content));
    });

    it('WHEN it is edited while being read THEN its mtime is the one after the read', async () => {
      await writeFile(join(root, 'edited.json'), '{}');
      reads.beforeRead = touchEdited;

      const files = await hashKeyedFiles(root, ['edited.json']);

      expect(files[0]?.mtimeMs).toBe(EDITED_AT_S * 1000);
    });

    it('WHEN it is empty THEN its digest is the sha256 of no bytes', async () => {
      const files = await hashKeyedFiles(root, ['empty.txt']);

      expect(files[0]?.digest).toBe(sha256Of(''));
    });
  });

  describe('GIVEN a regular file that grows while it is read', () => {
    it('WHEN it grows by less than 1 MiB THEN its digest is the sha256 of its grown content', async () => {
      const grownContent = Buffer.concat([Buffer.from('x'), Buffer.alloc(SMALL_GROWTH_BYTES, 'g')]);

      await writeFile(join(root, 'grown.json'), 'x');
      reads.beforeRead = growOnce('grown.json', SMALL_GROWTH_BYTES);

      const files = await hashKeyedFiles(root, ['grown.json']);

      expect(files[0]?.digest).toBe(sha256Of(grownContent));
    });

    it('WHEN it grows by more than 1 MiB THEN it is keyed unreadable by its grown size and mtime, as a file still being written', async () => {
      await writeFile(join(root, 'grown-far.json'), 'x');
      reads.beforeRead = growOnce('grown-far.json', LARGE_GROWTH_BYTES);

      const files = await hashKeyedFiles(root, ['grown-far.json']);
      const grown = await stat(join(root, 'grown-far.json'));

      expect(files).toStrictEqual([{ path: 'grown-far.json', digest: `unreadable:${grown.size}:${grown.mtimeMs}`, mtimeMs: grown.mtimeMs }]);
    });
  });

  describe('GIVEN a path that does not exist', () => {
    it('WHEN the file is missing THEN it is marked missing with no mtime', async () => {
      const files = await hashKeyedFiles(root, ['turbo.json']);

      expect(files).toStrictEqual([markerFile('turbo.json', 'missing')]);
    });

    it('WHEN a parent is a file THEN it is marked missing with no mtime', async () => {
      const files = await hashKeyedFiles(root, ['plain-file/package.json']);

      expect(files).toStrictEqual([markerFile('plain-file/package.json', 'missing')]);
    });
  });

  describe('GIVEN a path that is not a readable regular file', () => {
    it('WHEN it is a directory THEN it is marked not-regular', async () => {
      const files = await hashKeyedFiles(root, ['dir']);

      expect(files).toStrictEqual([markerFile('dir', 'not-regular')]);
    });

    it('WHEN it is a directory THEN it is never opened', async () => {
      await hashKeyedFiles(root, ['dir']);

      expect(reads.opened).not.toContain(join(root, 'dir'));
    });

    it('WHEN the path cannot be opened for a reason other than absence THEN it is marked unreadable', async () => {
      const files = await hashKeyedFiles(root, ['nul\0byte']);

      expect(files).toStrictEqual([markerFile('nul\0byte', 'unreadable')]);
    });

    it.skipIf(!IS_POSIX)('WHEN it is a FIFO THEN it is marked not-regular instead of blocking on the read', async () => {
      execFileSync('mkfifo', [join(root, 'fifo')]);

      const files = await hashKeyedFiles(root, ['fifo']);

      expect(files).toStrictEqual([markerFile('fifo', 'not-regular')]);
    });

    it.skipIf(!IS_POSIX)('WHEN it is a FIFO THEN it is never opened', async () => {
      execFileSync('mkfifo', [join(root, 'unopened-fifo')]);

      await hashKeyedFiles(root, ['unopened-fifo']);

      expect(reads.opened).not.toContain(join(root, 'unopened-fifo'));
    });

    it.skipIf(!IS_POSIX)('WHEN it is swapped for a FIFO between its stat and its open THEN it is marked not-regular', async () => {
      await writeFile(join(root, 'swapped.json'), '{}');
      reads.beforeOpen = swapForFifo('swapped.json');

      const files = await hashKeyedFiles(root, ['swapped.json']);

      expect(files).toStrictEqual([markerFile('swapped.json', 'not-regular')]);
    });

    it.skipIf(!CAN_DENY_READ)('WHEN it denies reading THEN it is marked unreadable and the call resolves', async () => {
      await writeFile(join(root, 'denied.json'), '{}');
      await chmod(join(root, 'denied.json'), 0o000);

      const files = await hashKeyedFiles(root, ['denied.json']);

      expect(files).toStrictEqual([markerFile('denied.json', 'unreadable')]);
    });

    it.skipIf(!IS_LINUX)(
      'WHEN it links to a procfs file that never ends THEN it is marked over-cap:read once it reads past its stat size',
      async () => {
        await symlink(PAGEMAP, join(root, 'pagemap.json'));

        const files = await hashKeyedFiles(root, ['pagemap.json']);

        expect(files).toStrictEqual([markerFile('pagemap.json', 'over-cap:read')]);
      },
      PAGEMAP_TIMEOUT_MS
    );
  });

  describe('GIVEN more paths than reads kept in flight', () => {
    it('WHEN they are hashed THEN each is hashed and listed in input order', { timeout: MANY_FILES_TIMEOUT_MS }, async () => {
      const names = Array.from({ length: MANY_FILES }, manyName);
      const paths = names.toReversed();
      const expected = paths.map(hashedAs);

      await Promise.all(paths.map(writeMany));

      const files = await hashKeyedFiles(root, paths);

      expect(files).toMatchObject(expected);
    });

    it('WHEN they are hashed THEN at most 16 reads are in flight at once', { timeout: MANY_FILES_TIMEOUT_MS }, async () => {
      const names = Array.from({ length: MANY_FILES }, burstName);

      await Promise.all(names.map(writeMany));
      reads.beforeRead = countInFlight;

      await hashKeyedFiles(root, names);

      expect(inFlight.peak).toBeGreaterThan(1);
      expect(inFlight.peak).toBeLessThanOrEqual(MAX_READS_IN_FLIGHT);
    });
  });
});
