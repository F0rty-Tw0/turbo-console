import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readCacheFile, writeCacheFile } from './cache-file.ts';
import { hashKeyedFiles } from './keyed-files.ts';
import { findEntry, storeWorkspace } from './store-workspace.ts';
import { getMemoryEntry, setMemoryEntry } from './workspace-memory.ts';
import type { WorkspaceModel } from '../../workspace/common/workspace-model.type.ts';
import { graphPackage } from '../../workspace/test/utils/graph.spec.util.ts';
import { MAX_CACHE_BYTES } from '../common/cache.const.ts';
import type { CacheEntry } from '../common/cache.type.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/cache.stub.ts';
import { backdateTree } from '../test/utils/backdate.spec.util.ts';
import { markAt } from '../test/utils/spawn-mark.spec.util.ts';
import { cacheKeyOf, keyedPathsOf } from '../utils/cache-key.util.ts';

const PACKAGES = [graphPackage('a', 'a', [], [])];

const KEYED_PATHS = keyedPathsOf(PACKAGES);

const AGE_MS = 10_000;

const TOO_LARGE = 'workspace model too large to cache';

let tempDir = '';

let caseCount = 0;

const newCaseDir = (): string => {
  caseCount += 1;

  return join(tempDir, `case ${caseCount}`);
};

/** A workspace root holding a root and an `a` package manifest, both last written `AGE_MS` ago. */
const newRoot = async (): Promise<string> => {
  const root = join(newCaseDir(), 'repo');

  await mkdir(join(root, 'a'), { recursive: true });
  await writeFile(join(root, 'package.json'), '{}');
  await writeFile(join(root, 'a', 'package.json'), '{}');
  await backdateTree(root, AGE_MS);

  return root;
};

const modelAt = (root: string): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, root };

  return model;
};

/** The key `storeWorkspace` must give `root` when no keyed file changed during the spawn. */
const fullKeyOf = async (root: string): Promise<string> => {
  const files = await hashKeyedFiles(root, KEYED_PATHS);

  return cacheKeyOf(files, WORKSPACE_MODEL_STUB.turboVersion);
};

describe('FEATURE: workspace store', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'store-workspace-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN keyed files last written before the spawn', () => {
    it('WHEN stored THEN memory holds the model, its keyed paths and their full key', async () => {
      const root = await newRoot();
      const model = modelAt(root);
      const key = await fullKeyOf(root);

      await storeWorkspace(model, PACKAGES, markAt(Date.now()), undefined);

      const expected: CacheEntry = { key, keyedPaths: KEYED_PATHS, model };

      expect(getMemoryEntry(root)).toStrictEqual(expected);
    });

    it('WHEN stored without a cache dir THEN it resolves null', async () => {
      const root = await newRoot();

      const writeError = await storeWorkspace(modelAt(root), PACKAGES, markAt(Date.now()), undefined);

      expect(writeError).toBeNull();
    });

    it('WHEN stored with a cache dir THEN it resolves null', async () => {
      const root = await newRoot();
      const cacheDir = join(newCaseDir(), 'cache dir');

      const writeError = await storeWorkspace(modelAt(root), PACKAGES, markAt(Date.now()), cacheDir);

      expect(writeError).toBeNull();
    });

    it('WHEN stored with a cache dir THEN the cache file holds the memory entry', async () => {
      const root = await newRoot();
      const cacheDir = join(newCaseDir(), 'cache dir');

      await storeWorkspace(modelAt(root), PACKAGES, markAt(Date.now()), cacheDir);

      const read = await readCacheFile(cacheDir, root);

      expect(read).toStrictEqual(getMemoryEntry(root));
    });
  });

  describe('GIVEN a graph package manifest deleted after turbo read it', () => {
    it('WHEN stored THEN the memory entry key is null', async () => {
      const root = await newRoot();

      await rm(join(root, 'a', 'package.json'));
      await storeWorkspace(modelAt(root), PACKAGES, markAt(Date.now()), undefined);

      expect(getMemoryEntry(root)?.key).toBeNull();
    });
  });

  describe('GIVEN a keyed file written during the spawn', () => {
    it('WHEN stored THEN the memory entry key is null', async () => {
      const root = await newRoot();
      const now = new Date();

      await utimes(join(root, 'package.json'), now, now);
      await storeWorkspace(modelAt(root), PACKAGES, markAt(now.getTime()), undefined);

      expect(getMemoryEntry(root)?.key).toBeNull();
    });
  });

  describe('GIVEN a model too large to cache', () => {
    it('WHEN stored with a cache dir THEN it resolves the too-large message naming the cache dir', async () => {
      const root = await newRoot();
      const warnings = ['x'.repeat(MAX_CACHE_BYTES)];
      const small = modelAt(root);
      const model: WorkspaceModel = { ...small, warnings };
      const cacheDir = join(newCaseDir(), 'cache dir');

      const writeError = await storeWorkspace(model, PACKAGES, markAt(Date.now()), cacheDir);

      expect(writeError).toBe(`${cacheDir}: ${TOO_LARGE}`);
    });
  });

  describe('GIVEN a root with an entry in memory', () => {
    it('WHEN found THEN it is the memory entry, though the cache dir is empty', async () => {
      const entry: CacheEntry = { key: 'a', keyedPaths: KEYED_PATHS, model: modelAt('/find/memory') };

      setMemoryEntry(entry);

      const found = await findEntry('/find/memory', join(newCaseDir(), 'cache dir'));

      expect(found).toBe(entry);
    });
  });

  describe('GIVEN a root with no entry in memory and a cache file on disk', () => {
    it('WHEN found THEN it is the file entry', async () => {
      const entry: CacheEntry = { key: 'a', keyedPaths: KEYED_PATHS, model: modelAt('/find/disk-1') };
      const cacheDir = join(newCaseDir(), 'cache dir');

      await writeCacheFile(cacheDir, entry);

      const found = await findEntry('/find/disk-1', cacheDir);

      expect(found).toStrictEqual(entry);
    });

    it('WHEN found THEN memory holds the file entry', async () => {
      const entry: CacheEntry = { key: 'a', keyedPaths: KEYED_PATHS, model: modelAt('/find/disk-2') };
      const cacheDir = join(newCaseDir(), 'cache dir');

      await writeCacheFile(cacheDir, entry);
      await findEntry('/find/disk-2', cacheDir);

      expect(getMemoryEntry('/find/disk-2')).toStrictEqual(entry);
    });
  });

  describe('GIVEN a root with an older cache file on disk and a newer entry stored while the file is read', () => {
    /** Writes an `older` cache file for `root`, starts `findEntry`, then stores a `newer` entry before the read resolves. */
    const findDuringStore = async (root: string): Promise<CacheEntry | null> => {
      const older: CacheEntry = { key: 'older', keyedPaths: KEYED_PATHS, model: modelAt(root) };
      const newer: CacheEntry = { key: 'newer', keyedPaths: KEYED_PATHS, model: modelAt(root) };
      const cacheDir = join(newCaseDir(), 'cache dir');

      await writeCacheFile(cacheDir, older);

      const finding = findEntry(root, cacheDir);

      setMemoryEntry(newer);

      return finding;
    };

    it('WHEN found THEN it is the newer entry', async () => {
      const found = await findDuringStore('/find/race-1');

      expect(found?.key).toBe('newer');
    });

    it('WHEN found THEN memory still holds the newer entry', async () => {
      await findDuringStore('/find/race-2');

      expect(getMemoryEntry('/find/race-2')?.key).toBe('newer');
    });
  });

  describe('GIVEN a root with no entry in memory or on disk', () => {
    it('WHEN found THEN it is null', async () => {
      const found = await findEntry('/find/none', join(newCaseDir(), 'cache dir'));

      expect(found).toBeNull();
    });
  });
});
