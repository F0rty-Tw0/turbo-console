import { appendFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { readCachedWorkspace } from './read-cached-workspace.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import type { WorkspaceModel } from '../../workspace/common/workspace-model.type.ts';
import { graphPackage } from '../../workspace/test/utils/graph.spec.util.ts';
import type { KeyedFile } from '../common/cache.type.ts';
import type * as keyedFiles from '../data-access/keyed-files.ts';
import { storeWorkspace } from '../data-access/store-workspace.ts';
import type { SettledRead } from '../test/common/cache.type.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/cache.stub.ts';
import { backdateTree } from '../test/utils/backdate.spec.util.ts';
import { settledRead } from '../test/utils/settled-read.spec.util.ts';
import { markAt } from '../test/utils/spawn-mark.spec.util.ts';
import { cacheFileName } from '../utils/cache-key.util.ts';

const hashing = vi.hoisted(() => {
  const state = { isFailing: false, calls: 0 };

  return state;
});

vi.mock('../data-access/keyed-files.ts', async (importOriginal) => {
  const real = await importOriginal<typeof keyedFiles>();

  const hashKeyedFiles = async (root: string, paths: string[]): Promise<KeyedFile[]> => {
    hashing.calls += 1;

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

const VERSION = WORKSPACE_MODEL_STUB.turboVersion;

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

const cached = (model: WorkspaceModel, isFresh: boolean): SettledRead => {
  const workspace: SettledRead = { model, isFresh };

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
    hashing.calls = 0;
  });

  describe('GIVEN a workspace stored with a cache dir', () => {
    it('WHEN its cache file is deleted, then read THEN the memory entry is fresh', async () => {
      const root = await newRoot();
      const model = modelAt(root);
      const cacheDir = join(newCaseDir(), 'cache dir');

      await storeWorkspace(model, PACKAGES, markAt(Date.now()), cacheDir);
      await rm(join(cacheDir, cacheFileName(root)));

      const read = await readCachedWorkspace(root, cacheDir);
      const settled = await settledRead(read, VERSION);

      expect(settled).toStrictEqual(cached(model, true));
    });

    it.each([`${sep}`, `${sep}a${sep}..`])(
      'WHEN read with the root plus %j THEN it is the entry of the normalized root, fresh',
      async (suffix) => {
        const root = await newRoot();
        const model = modelAt(root);
        const cacheDir = join(newCaseDir(), 'cache dir');

        await storeWorkspace(model, PACKAGES, markAt(Date.now()), cacheDir);

        const read = await readCachedWorkspace(`${root}${suffix}`, cacheDir);
        const settled = await settledRead(read, VERSION);

        expect(settled).toStrictEqual(cached(model, true));
      }
    );

    it('WHEN read with a relative root THEN it rejects invalid-argument', async () => {
      const root = await newRoot();
      const cacheDir = join(newCaseDir(), 'cache dir');

      await storeWorkspace(modelAt(root), PACKAGES, markAt(Date.now()), cacheDir);

      const reading = readCachedWorkspace('repo', cacheDir);

      await expect(reading).rejects.toMatchObject({ kind: 'invalid-argument', message: 'turbo root must be absolute: repo' });
    });

    it('WHEN a keyed file is edited, then read THEN it is stale with its model', async () => {
      const root = await newRoot();
      const model = modelAt(root);
      const cacheDir = join(newCaseDir(), 'cache dir');

      await storeWorkspace(model, PACKAGES, markAt(Date.now()), cacheDir);
      await appendFile(join(root, 'a', 'package.json'), '\n');

      const read = await readCachedWorkspace(root, cacheDir);
      const settled = await settledRead(read, VERSION);

      expect(settled).toStrictEqual(cached(model, false));
    });
  });

  describe('GIVEN a workspace stored while a graph package manifest was missing', () => {
    it('WHEN read with the manifest still missing THEN it is stale', async () => {
      const root = await newRoot();
      const model = modelAt(root);

      await rm(join(root, 'a', 'package.json'));
      await storeWorkspace(model, PACKAGES, markAt(Date.now()), undefined);

      const read = await readCachedWorkspace(root, join(newCaseDir(), 'cache dir'));
      const settled = await settledRead(read, VERSION);

      expect(settled).toStrictEqual(cached(model, false));
    });
  });

  describe('GIVEN a stored workspace whose read model the caller then changes', () => {
    it('WHEN read again THEN it is the stored model, still fresh', async () => {
      const root = await newRoot();
      const model = modelAt(root);
      const original = structuredClone(model);

      await storeWorkspace(model, PACKAGES, markAt(Date.now()), undefined);

      const first = await readCachedWorkspace(root, join(newCaseDir(), 'cache dir'));

      first?.model.warnings.push('changed');
      first?.model.packages.reverse();

      const read = await readCachedWorkspace(root, join(newCaseDir(), 'cache dir'));
      const settled = await settledRead(read, VERSION);

      expect(settled).toStrictEqual(cached(original, true));
    });
  });

  describe('GIVEN a workspace stored under turbo 2.11.7', () => {
    it('WHEN read with turbo 2.11.8 THEN it is stale', async () => {
      const root = await newRoot();
      const model = modelAt(root);

      await storeWorkspace(model, PACKAGES, markAt(Date.now()), undefined);

      const read = await readCachedWorkspace(root, join(newCaseDir(), 'cache dir'));
      const settled = await settledRead(read, '2.11.8');

      expect(settled).toStrictEqual(cached(model, false));
    });
  });

  describe('GIVEN a workspace stored in memory and a cache dir that is not absolute', () => {
    it.each(['', 'cache dir'])(
      'WHEN read with %j THEN it rejects invalid-argument instead of returning the entry',
      async (cacheDir) => {
        const root = await newRoot();

        await storeWorkspace(modelAt(root), PACKAGES, markAt(Date.now()), undefined);

        const reading = readCachedWorkspace(root, cacheDir);

        await expect(reading).rejects.toMatchObject({ kind: 'invalid-argument', message: `cacheDir must be absolute: ${cacheDir}` });
      }
    );
  });

  describe('GIVEN a root with no entry in memory or on disk', () => {
    it('WHEN read THEN it is null', async () => {
      const root = await newRoot();

      const read = await readCachedWorkspace(root, join(newCaseDir(), 'cache dir'));

      expect(read).toBeNull();
    });
  });

  describe('GIVEN a stored workspace whose keyed files then fail to hash', () => {
    it('WHEN read THEN its model is still returned', async () => {
      const root = await newRoot();
      const model = modelAt(root);

      await storeWorkspace(model, PACKAGES, markAt(Date.now()), undefined);
      hashing.isFailing = true;

      const read = await readCachedWorkspace(root, join(newCaseDir(), 'cache dir'));

      expect(read?.model).toStrictEqual(model);
    });

    it('WHEN its freshness is checked THEN it rejects with a TurboException for the cache read', async () => {
      const root = await newRoot();

      await storeWorkspace(modelAt(root), PACKAGES, markAt(Date.now()), undefined);
      hashing.isFailing = true;

      const read = await readCachedWorkspace(root, join(newCaseDir(), 'cache dir'));
      const checking = read?.isFresh(VERSION);

      await expect(checking).rejects.toBeInstanceOf(TurboException);
    });
  });

  describe('GIVEN a stored workspace', () => {
    it('WHEN read THEN its model is returned before any keyed file is hashed', async () => {
      const root = await newRoot();
      const model = modelAt(root);

      await storeWorkspace(model, PACKAGES, markAt(Date.now()), undefined);
      hashing.calls = 0;

      const read = await readCachedWorkspace(root, join(newCaseDir(), 'cache dir'));

      expect(read?.model).toStrictEqual(model);
      expect(hashing.calls).toBe(0);
    });

    it('WHEN its freshness is checked THEN its keyed files are hashed once', async () => {
      const root = await newRoot();

      await storeWorkspace(modelAt(root), PACKAGES, markAt(Date.now()), undefined);

      const read = await readCachedWorkspace(root, join(newCaseDir(), 'cache dir'));

      hashing.calls = 0;
      await read?.isFresh(VERSION);

      expect(hashing.calls).toBe(1);
    });
  });

  describe('GIVEN a workspace stored with a null key, a keyed file written after its spawn started', () => {
    it('WHEN read THEN it is stale with its model', async () => {
      const root = await newRoot();
      const model = modelAt(root);

      await storeWorkspace(model, PACKAGES, markAt(Date.now() - 2 * AGE_MS), undefined);

      const read = await readCachedWorkspace(root, join(newCaseDir(), 'cache dir'));
      const settled = await settledRead(read, VERSION);

      expect(settled).toStrictEqual(cached(model, false));
    });
  });
});
