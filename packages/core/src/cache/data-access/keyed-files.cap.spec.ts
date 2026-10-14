import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { hashKeyedFiles } from './keyed-files.ts';
import type * as cacheConst from '../common/cache.const.ts';
import type { KeyedFile } from '../common/cache.type.ts';

/** Small enough to cross without writing the real 4 MiB, and over one 64 KiB read chunk so the cap spans reads. */
const CAP_BYTES = vi.hoisted(() => 100 * 1024);

/** Stands in for the real 64 MiB lockfile cap: twice `CAP_BYTES`, so a lockfile between the two caps tells them apart. */
const LOCKFILE_CAP_BYTES = vi.hoisted(() => 200 * 1024);

vi.mock('../common/cache.const.ts', async (importOriginal) => {
  const real = await importOriginal<typeof cacheConst>();
  // eslint-disable-next-line @typescript-eslint/naming-convention -- the mocked module's own constant name.
  const mocked = { ...real, MAX_KEYED_FILE_BYTES: CAP_BYTES, MAX_LOCKFILE_BYTES: LOCKFILE_CAP_BYTES };

  return mocked;
});

const statLie = vi.hoisted(() => {
  const state = { path: '', size: 0 };

  return state;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();

  /** A handle opened on `statLie.path` reports `statLie.size` from every stat, as a file whose stat size lies would. */
  const open = async (...args: Parameters<typeof real.open>): Promise<fsPromises.FileHandle> => {
    const handle = await real.open(...args);
    const openedPath = String(args[0]);
    const isLying = openedPath === statLie.path;

    if (!isLying) return handle;

    const stat = handle.stat.bind(handle);
    const lyingStat = async (): Promise<Stats> => {
      const stats = await stat();

      stats.size = statLie.size;

      return stats;
    };

    Object.defineProperty(handle, 'stat', { value: lyingStat });

    return handle;
  };

  const mocked = { ...real, open };

  return mocked;
});

/** The stat size a lying handle reports: far under `CAP_BYTES`, so only the cap, not the 1 MiB slack past it, stops the read. */
const LYING_SIZE_BYTES = 1;

/** Whole seconds, so the mtime a stat reports back is exact on every filesystem. */
const FIRST_MTIME_S = 1_000_000_000;

const SECOND_MTIME_S = 1_000_000_100;

let root = '';

const sha256Of = (data: Buffer): string => {
  const hash = createHash('sha256');

  hash.update(data);

  return hash.digest('hex');
};

describe('FEATURE: keyed file byte cap', () => {
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'keyed-files-cap-'));
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  afterEach(() => {
    statLie.path = '';
  });

  describe('GIVEN a regular file that is no lockfile', () => {
    it('WHEN it holds exactly the cap THEN its digest is the sha256 of its content', async () => {
      const content = Buffer.alloc(CAP_BYTES, 'a');

      await writeFile(join(root, 'at-cap.json'), content);

      const files = await hashKeyedFiles(root, ['at-cap.json']);

      expect(files[0]?.digest).toBe(sha256Of(content));
    });

    it('WHEN it holds one byte over the cap THEN it is keyed by its size and mtime', async () => {
      const path = join(root, 'over-cap.json');

      await writeFile(path, Buffer.alloc(CAP_BYTES + 1, 'a'));
      await utimes(path, FIRST_MTIME_S, FIRST_MTIME_S);

      const files = await hashKeyedFiles(root, ['over-cap.json']);
      const mtimeMs = FIRST_MTIME_S * 1000;
      const expected: KeyedFile = { path: 'over-cap.json', digest: `over-cap:${CAP_BYTES + 1}:${mtimeMs}`, mtimeMs };

      expect(files).toStrictEqual([expected]);
    });

    it('WHEN an over-cap file is rewritten at the same size with a new mtime THEN its digest changes', async () => {
      const path = join(root, 'rewritten.json');

      await writeFile(path, Buffer.alloc(CAP_BYTES + 1, 'a'));
      await utimes(path, FIRST_MTIME_S, FIRST_MTIME_S);

      const [before] = await hashKeyedFiles(root, ['rewritten.json']);

      await writeFile(path, Buffer.alloc(CAP_BYTES + 1, 'b'));
      await utimes(path, SECOND_MTIME_S, SECOND_MTIME_S);

      const [after] = await hashKeyedFiles(root, ['rewritten.json']);

      expect(after?.digest).not.toBe(before?.digest);
    });

    it('WHEN a package.json holds one byte over the cap THEN it is keyed by its size and mtime', async () => {
      await mkdir(join(root, 'pkg'));
      await writeFile(join(root, 'pkg', 'package.json'), Buffer.alloc(CAP_BYTES + 1, 'a'));

      const files = await hashKeyedFiles(root, ['pkg/package.json']);

      expect(files[0]?.digest).toContain(`over-cap:${CAP_BYTES + 1}:`);
    });
  });

  describe('GIVEN a regular file whose stat size stays under the cap while it reads past it', () => {
    it('WHEN it is hashed THEN it is marked over-cap:read once the read passes the cap', async () => {
      const path = join(root, 'lying-size.json');

      await writeFile(path, Buffer.alloc(2 * CAP_BYTES, 'a'));
      statLie.path = path;
      statLie.size = LYING_SIZE_BYTES;

      const files = await hashKeyedFiles(root, ['lying-size.json']);
      const expected: KeyedFile = { path: 'lying-size.json', digest: 'over-cap:read', mtimeMs: null };

      expect(files).toStrictEqual([expected]);
    });
  });

  describe('GIVEN a lockfile', () => {
    it('WHEN it holds more than the other cap but exactly its own THEN its digest is the sha256 of its content', async () => {
      const content = Buffer.alloc(LOCKFILE_CAP_BYTES, 'a');

      await mkdir(join(root, 'at-lockfile-cap'));
      await writeFile(join(root, 'at-lockfile-cap', 'yarn.lock'), content);

      const files = await hashKeyedFiles(root, ['at-lockfile-cap/yarn.lock']);

      expect(files[0]?.digest).toBe(sha256Of(content));
    });

    it('WHEN it holds one byte over its own cap THEN it is keyed by its size and mtime', async () => {
      const path = join(root, 'over-lockfile-cap', 'pnpm-lock.yaml');

      await mkdir(join(root, 'over-lockfile-cap'));
      await writeFile(path, Buffer.alloc(LOCKFILE_CAP_BYTES + 1, 'a'));
      await utimes(path, FIRST_MTIME_S, FIRST_MTIME_S);

      const files = await hashKeyedFiles(root, ['over-lockfile-cap/pnpm-lock.yaml']);
      const mtimeMs = FIRST_MTIME_S * 1000;
      const digest = `over-cap:${LOCKFILE_CAP_BYTES + 1}:${mtimeMs}`;
      const expected: KeyedFile = { path: 'over-lockfile-cap/pnpm-lock.yaml', digest, mtimeMs };

      expect(files).toStrictEqual([expected]);
    });
  });
});
