import { appendFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { readCachedWorkspace } from './read-cached-workspace.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../../binary/common/index.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import type { WorkspaceModel } from '../../workspace/common/workspace-model.type.ts';
import { graphPackage } from '../../workspace/test/utils/graph.spec.util.ts';
import type { CachedWorkspace, KeyedFile } from '../common/cache.type.ts';
import type * as keyedFiles from '../data-access/keyed-files.ts';
import { storeWorkspace } from '../data-access/store-workspace.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/cache.stub.ts';
import { backdateTree } from '../test/utils/backdate.spec.util.ts';
import { cacheFileName } from '../utils/cache-key.util.ts';

const hashing = vi.hoisted(() => {
  const state = { isFailing: false };

  return state;
});

vi.mock('../data-access/keyed-files.ts', async (importOriginal) => {
  const real = await importOriginal<typeof keyedFiles>();

  const hashKeyedFiles = async (root: string, paths: string[]): Promise<KeyedFile[]> => {
    if (hashing.isFailing) throw new Error('hash failed');

    return real.hashKeyedFiles(root, paths);
  };

  const mocked = { ...real, hashKeyedFiles };

  return mocked;
});

const PACKAGES = [graphPackage('a', 'a', [], [])];

const AGE_MS = 10_000;

let tempDir = '';

let caseCount = 0;

const newCaseDir = (): string => {
  caseCount += 1;

  return join(tempDir, `case ${caseCount}`);
};

const binaryAt = (root: string): TurboBinary => new TurboBinary(root, join(root, 'turbo'), WORKSPACE_MODEL_STUB.turboVersion, 'override');

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

const cached = (model: WorkspaceModel, isFresh: boolean): CachedWorkspace => {
  const workspace: CachedWorkspace = { model, isFresh };

  return workspace;
};

describe('FEATURE: cached workspace read', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'read-cached-workspace-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  afterEach(() => {
    hashing.isFailing = false;
  });

  describe('GIVEN a workspace stored with a cache dir', () => {
    it('WHEN its cache file is deleted, then read THEN the memory entry is fresh', async () => {
      const root = await newRoot();
      const model = modelAt(root);
      const cacheDir = join(newCaseDir(), 'cache dir');

      await storeWorkspace(model, PACKAGES, Date.now(), cacheDir);
      await rm(join(cacheDir, cacheFileName(root)));

      const read = await readCachedWorkspace(binaryAt(root), cacheDir);

      expect(read).toStrictEqual(cached(model, true));
    });

    it('WHEN a keyed file is edited, then read THEN it is stale with its model', async () => {
      const root = await newRoot();
      const model = modelAt(root);
      const cacheDir = join(newCaseDir(), 'cache dir');

      await storeWorkspace(model, PACKAGES, Date.now(), cacheDir);
      await appendFile(join(root, 'a', 'package.json'), '\n');

      const read = await readCachedWorkspace(binaryAt(root), cacheDir);

      expect(read).toStrictEqual(cached(model, false));
    });
  });

  describe('GIVEN a workspace stored while a graph package manifest was missing', () => {
    it('WHEN read with the manifest still missing THEN it is stale', async () => {
      const root = await newRoot();
      const model = modelAt(root);

      await rm(join(root, 'a', 'package.json'));
      await storeWorkspace(model, PACKAGES, Date.now(), undefined);

      const read = await readCachedWorkspace(binaryAt(root), join(newCaseDir(), 'cache dir'));

      expect(read).toStrictEqual(cached(model, false));
    });
  });

  describe('GIVEN a stored workspace whose read model the caller then changes', () => {
    it('WHEN read again THEN it is the stored model, still fresh', async () => {
      const root = await newRoot();
      const model = modelAt(root);
      const original = structuredClone(model);

      await storeWorkspace(model, PACKAGES, Date.now(), undefined);

      const first = await readCachedWorkspace(binaryAt(root), join(newCaseDir(), 'cache dir'));

      first?.model.warnings.push('changed');
      first?.model.packages.reverse();

      const read = await readCachedWorkspace(binaryAt(root), join(newCaseDir(), 'cache dir'));

      expect(read).toStrictEqual(cached(original, true));
    });
  });

  describe('GIVEN a workspace stored under turbo 2.11.7', () => {
    it('WHEN read with turbo 2.11.8 THEN it is stale', async () => {
      const root = await newRoot();
      const model = modelAt(root);
      const upgraded = new TurboBinary(root, join(root, 'turbo'), '2.11.8', 'override');

      await storeWorkspace(model, PACKAGES, Date.now(), undefined);

      const read = await readCachedWorkspace(upgraded, join(newCaseDir(), 'cache dir'));

      expect(read).toStrictEqual(cached(model, false));
    });
  });

  describe('GIVEN a root with no entry in memory or on disk', () => {
    it('WHEN read THEN it is null', async () => {
      const root = await newRoot();

      const read = await readCachedWorkspace(binaryAt(root), join(newCaseDir(), 'cache dir'));

      expect(read).toBeNull();
    });
  });

  describe('GIVEN a stored workspace whose keyed files then fail to hash', () => {
    it('WHEN read THEN it rejects with a TurboException for the cache read', async () => {
      const root = await newRoot();

      await storeWorkspace(modelAt(root), PACKAGES, Date.now(), undefined);
      hashing.isFailing = true;

      const reading = readCachedWorkspace(binaryAt(root), join(newCaseDir(), 'cache dir'));

      await expect(reading).rejects.toBeInstanceOf(TurboException);
    });
  });
});
