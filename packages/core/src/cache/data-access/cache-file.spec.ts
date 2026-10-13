import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import { readCacheFile, writeCacheFile } from './cache-file.ts';
import type { WorkspaceModel } from '../../workspace/common/workspace-model.type.ts';
import { workspaceModelSchema } from '../common/cache-file.schema.ts';
import type { CacheEntry } from '../common/cache.type.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/cache.stub.ts';
import { cacheFileName } from '../utils/cache-key.util.ts';

const ROOT = WORKSPACE_MODEL_STUB.root;

const KEYED_PATHS = ['.npmrc', 'apps/web/package.json', 'apps/web/turbo.jsonc', 'package.json', 'tools/e2e-1-atoms/turbo.json'];

const ENTRY: CacheEntry = { key: 'abc', keyedPaths: KEYED_PATHS, model: WORKSPACE_MODEL_STUB };

const STALE_ENTRY: CacheEntry = { key: null, keyedPaths: KEYED_PATHS, model: WORKSPACE_MODEL_STUB };

const ROUND_TRIPS: [string, CacheEntry][] = [
  ['a key', ENTRY],
  ['a null key', STALE_ENTRY]
];

/** Named like a keyed file, but each would reach a file outside the root once joined to it. */
const TAMPERED_PATHS = ['../package.json', '/etc/package.json', 'C:/package.json', '..\\package.json', 'a\\b/../../package.json'];

/** Inside the root, but no file a cache key hashes: a device name, a FIFO, a secret. */
const TAMPERED_NAMES = ['COM1', 'fifo', 'a/secret.txt'];

/** mkfifo and permission bits are POSIX only. */
const IS_POSIX = process.platform !== 'win32';

const PERMISSION_BITS = 0o777;

let tempDir = '';

let caseCount = 0;

/** A new, not yet created cache dir for one case, its name holding a space. */
const newCacheDir = (): string => {
  caseCount += 1;

  return join(tempDir, `case ${caseCount}`, 'cache dir');
};

/** A cache dir holding `ENTRY` as written to disk, so a case can edit the file before reading it. */
const writtenEntry = async (): Promise<string> => {
  const cacheDir = newCacheDir();

  await writeCacheFile(cacheDir, ENTRY);

  return cacheDir;
};

const cacheFilePath = (cacheDir: string, root: string): string => join(cacheDir, cacheFileName(root));

/** The parsed JSON of `ENTRY`'s file, changed by `edit`, written back in its place. */
const rewriteEntry = async (cacheDir: string, edit: (json: Record<string, unknown>) => void): Promise<void> => {
  const path = cacheFilePath(cacheDir, ROOT);
  const text = await readFile(path, 'utf8');
  const json = JSON.parse(text) as Record<string, unknown>;

  edit(json);
  await writeFile(path, JSON.stringify(json));
};

describe('FEATURE: workspace cache file', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cache-file-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN the cache file schema', () => {
    it('WHEN its model type is inferred THEN it equals WorkspaceModel and parses a model unchanged', () => {
      expectTypeOf<z.infer<typeof workspaceModelSchema>>().toEqualTypeOf<WorkspaceModel>();

      const parsed = workspaceModelSchema.parse(WORKSPACE_MODEL_STUB);

      expect(parsed).toStrictEqual(WORKSPACE_MODEL_STUB);
    });
  });

  describe('GIVEN an entry written to a cache dir that does not exist yet', () => {
    it.each(ROUND_TRIPS)('WHEN an entry with %s is read back THEN it equals the entry', async (_, entry) => {
      const cacheDir = newCacheDir();
      const writeError = await writeCacheFile(cacheDir, entry);

      const read = await readCacheFile(cacheDir, ROOT);

      expect(writeError).toBeNull();
      expect(read).toStrictEqual(entry);
    });

    it.skipIf(!IS_POSIX)('WHEN the cache file is written THEN only its owner can read or write it', async () => {
      const cacheDir = await writtenEntry();

      const { mode } = await stat(cacheFilePath(cacheDir, ROOT));

      expect(mode & PERMISSION_BITS).toBe(0o600);
    });

    it.skipIf(!IS_POSIX)('WHEN the cache dir is created THEN only its owner can list or enter it', async () => {
      const cacheDir = await writtenEntry();

      const { mode } = await stat(cacheDir);

      expect(mode & PERMISSION_BITS).toBe(0o700);
    });

    it('WHEN the dir is listed THEN it holds only the root cache file, no temp file', async () => {
      const cacheDir = await writtenEntry();

      const names = await readdir(cacheDir);

      expect(names).toStrictEqual([cacheFileName(ROOT)]);
    });
  });

  describe('GIVEN no readable cache file', () => {
    it('WHEN the cache dir is empty THEN the read is null', async () => {
      const cacheDir = newCacheDir();

      await mkdir(cacheDir, { recursive: true });

      const read = await readCacheFile(cacheDir, ROOT);

      expect(read).toBeNull();
    });

    it('WHEN the cache file path is a directory THEN the read is null', async () => {
      const cacheDir = newCacheDir();

      await mkdir(cacheFilePath(cacheDir, ROOT), { recursive: true });

      const read = await readCacheFile(cacheDir, ROOT);

      expect(read).toBeNull();
    });
  });

  describe('GIVEN a FIFO at the cache file path', () => {
    it.skipIf(!IS_POSIX)('WHEN it is read THEN the read is null at once instead of waiting for a writer', async () => {
      const cacheDir = newCacheDir();

      await mkdir(cacheDir, { recursive: true });
      execFileSync('mkfifo', [cacheFilePath(cacheDir, ROOT)]);

      const read = await readCacheFile(cacheDir, ROOT);

      expect(read).toBeNull();
    });
  });

  describe('GIVEN a cache file that no longer holds a valid entry', () => {
    it('WHEN it is truncated THEN the read is null', async () => {
      const cacheDir = await writtenEntry();

      await writeFile(cacheFilePath(cacheDir, ROOT), '{');

      const read = await readCacheFile(cacheDir, ROOT);

      expect(read).toBeNull();
    });

    it('WHEN its formatVersion is 1, the version before the task-name fix THEN the read is null', async () => {
      const cacheDir = await writtenEntry();

      await rewriteEntry(cacheDir, (json) => Reflect.set(json, 'formatVersion', 1));

      const read = await readCacheFile(cacheDir, ROOT);

      expect(read).toBeNull();
    });

    it('WHEN its model breaks the schema THEN the read is null', async () => {
      const cacheDir = await writtenEntry();

      await rewriteEntry(cacheDir, (json) => Reflect.set(json, 'model', { root: ROOT }));

      const read = await readCacheFile(cacheDir, ROOT);

      expect(read).toBeNull();
    });

    it.each(TAMPERED_PATHS)('WHEN a keyed path is %j THEN the read is null', async (path) => {
      const cacheDir = await writtenEntry();

      await rewriteEntry(cacheDir, (json) => Reflect.set(json, 'keyedPaths', ['package.json', path]));

      const read = await readCacheFile(cacheDir, ROOT);

      expect(read).toBeNull();
    });

    it.each(TAMPERED_NAMES)('WHEN a keyed path is %j, which no cache key hashes, THEN the read is null', async (path) => {
      const cacheDir = await writtenEntry();

      await rewriteEntry(cacheDir, (json) => Reflect.set(json, 'keyedPaths', ['package.json', path]));

      const read = await readCacheFile(cacheDir, ROOT);

      expect(read).toBeNull();
    });

    it('WHEN it holds the model of another root THEN the read is null', async () => {
      const cacheDir = await writtenEntry();

      await rename(cacheFilePath(cacheDir, ROOT), cacheFilePath(cacheDir, '/other'));

      const read = await readCacheFile(cacheDir, '/other');

      expect(read).toBeNull();
    });
  });

  describe('GIVEN a cache dir that cannot be written', () => {
    it('WHEN the cache dir is an existing file THEN the write resolves with a message naming it', async () => {
      const cacheDir = join(tempDir, 'cache-file-not-dir');

      await writeFile(cacheDir, '');

      const writeError = await writeCacheFile(cacheDir, ENTRY);

      expect(writeError).toContain(cacheDir);
    });

    it('WHEN the cache file path is a non-empty directory THEN the write resolves with a message naming the dir', async () => {
      const cacheDir = newCacheDir();

      await mkdir(join(cacheFilePath(cacheDir, ROOT), 'inner'), { recursive: true });

      const writeError = await writeCacheFile(cacheDir, ENTRY);

      expect(writeError).toContain(cacheDir);
    });

    it('WHEN the rename over a non-empty directory fails THEN no temp file is left', async () => {
      const cacheDir = newCacheDir();

      await mkdir(join(cacheFilePath(cacheDir, ROOT), 'inner'), { recursive: true });
      await writeCacheFile(cacheDir, ENTRY);

      const names = await readdir(cacheDir);

      expect(names).toStrictEqual([cacheFileName(ROOT)]);
    });
  });
});
