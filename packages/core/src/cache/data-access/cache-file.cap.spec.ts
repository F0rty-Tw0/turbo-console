import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { readCacheFile, writeCacheFile } from './cache-file.ts';
import type * as cacheConst from '../common/cache.const.ts';
import type { CacheEntry } from '../common/cache.type.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/cache.stub.ts';
import { cacheFileName } from '../utils/cache-key.util.ts';

const cap = vi.hoisted(() => {
  const state = { bytes: 4096 };

  return state;
});

vi.mock('../common/cache.const.ts', async (importOriginal) => {
  const real = await importOriginal<typeof cacheConst>();
  // eslint-disable-next-line @typescript-eslint/naming-convention -- the mocked module's own constant name.
  const mocked = { ...real, MAX_CACHE_BYTES: cap.bytes };

  return mocked;
});

const ROOT = WORKSPACE_MODEL_STUB.root;

const TOO_LARGE = 'workspace model too large to cache';

const KEYED_PATHS = ['package.json'];

const ENTRY: CacheEntry = { key: 'abc', keyedPaths: KEYED_PATHS, model: WORKSPACE_MODEL_STUB };

const warningOf = (_: unknown, index: number): string => `turbo.json: warning ${index}`;

/** 200 warnings of ~25 bytes: well over the 4096-byte cap of this spec. */
const LARGE_WARNINGS = Array.from({ length: 200 }, warningOf);

const LARGE_MODEL = { ...WORKSPACE_MODEL_STUB, warnings: LARGE_WARNINGS };

const LARGE_ENTRY: CacheEntry = { key: 'abc', keyedPaths: KEYED_PATHS, model: LARGE_MODEL };

let tempDir = '';

let caseCount = 0;

const newCacheDir = (): string => {
  caseCount += 1;

  return join(tempDir, `case ${caseCount}`, 'cache dir');
};

/** `ENTRY`'s cache file text padded with trailing spaces (still valid JSON) to exactly `bytes`, written to a new cache dir. */
const paddedEntry = async (bytes: number): Promise<string> => {
  const cacheDir = newCacheDir();
  const file = { formatVersion: 2, ...ENTRY };
  const json = JSON.stringify(file);

  await mkdir(cacheDir, { recursive: true });
  await writeFile(join(cacheDir, cacheFileName(ROOT)), json.padEnd(bytes));

  return cacheDir;
};

const throwRangeError = (): never => {
  throw new RangeError('Invalid string length');
};

describe('FEATURE: workspace cache file size cap', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cache-file-cap-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GIVEN a model whose cache file would pass the cap', () => {
    it('WHEN it is written THEN the write resolves with the too-large message naming the cache dir', async () => {
      const cacheDir = newCacheDir();

      const writeError = await writeCacheFile(cacheDir, LARGE_ENTRY);

      expect(writeError).toBe(`${cacheDir}: ${TOO_LARGE}`);
    });

    it('WHEN it is written THEN nothing is written, the cache dir included', async () => {
      const cacheDir = newCacheDir();

      await writeCacheFile(cacheDir, LARGE_ENTRY);

      const isCreated = existsSync(cacheDir);

      expect(isCreated).toBe(false);
    });
  });

  describe('GIVEN a model that JSON.stringify cannot serialize', () => {
    it('WHEN it is written THEN the write resolves with the too-large message, not an io code', async () => {
      const cacheDir = newCacheDir();

      vi.spyOn(JSON, 'stringify').mockImplementationOnce(throwRangeError);

      const writeError = await writeCacheFile(cacheDir, ENTRY);

      expect(writeError).toBe(`${cacheDir}: ${TOO_LARGE}`);
    });
  });

  describe('GIVEN a cache file already on disk', () => {
    it('WHEN it is exactly at the cap THEN it is read', async () => {
      const cacheDir = await paddedEntry(cap.bytes);

      const read = await readCacheFile(cacheDir, ROOT);

      expect(read).toStrictEqual(ENTRY);
    });

    it('WHEN it is one byte over the cap THEN the read is null', async () => {
      const cacheDir = await paddedEntry(cap.bytes + 1);

      const read = await readCacheFile(cacheDir, ROOT);

      expect(read).toBeNull();
    });
  });
});
