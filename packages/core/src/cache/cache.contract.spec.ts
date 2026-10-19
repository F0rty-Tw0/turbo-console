import type * as childProcess from 'node:child_process';
import { appendFile, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import type { FixtureHandle } from '@turbo-console/repo-gen';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { loadWorkspace, readCachedWorkspace, resolveTurbo } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { CachedWorkspace, TurboBinary, WorkspaceModel } from '../index.ts';
import type { SettledRead } from './test/common/cache.type.ts';
import { backdateTree } from './test/utils/backdate.spec.util.ts';
import { settledRead } from './test/utils/settled-read.spec.util.ts';
import { cacheFileName } from './utils/cache-key.util.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from '../shared/turbo/test/utils/fixture-hook.spec.util.ts';

type CacheReader = (root: string, cacheDir: string) => Promise<CachedWorkspace | null>;

const spawns = vi.hoisted(() => {
  const files: string[] = [];
  const state = { files };

  return state;
});

vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof childProcess>();
  const { recordingExecFile } = await import('../shared/turbo/test/utils/spawn-recorder.spec.util.ts');
  const mocked = { ...real, execFile: recordingExecFile(real.execFile, spawns.files) };

  return mocked;
});

const targetLike = PRESETS['target-like'];

/** Old enough that no keyed file counts as written during the next load's spawn. */
const AGE_MS = 10_000;

/** A visible package manifest, a definitions package config, the root config, the lockfile and `.npmrc`. */
const STALE_FILES = ['apps/e2e-1/package.json', 'tools/e2e-1-atoms/turbo.json', 'turbo.json', 'pnpm-lock.yaml', '.npmrc'];

const TRUSTED = { trusted: true } as const;

let tempDir = '';

let caseCount = 0;

/** A new, not yet created cache dir, its name holding a space (Review Focus 5). */
const newCacheDir = (): string => {
  caseCount += 1;

  return join(tempDir, `case ${caseCount}`, 'cache dir');
};

const turboSpawns = (binary: TurboBinary): number => spawns.files.filter((file) => file === binary.path).length;

/** Resolves the dev turbo for `fixture`, then clears the spawn record its `--version` left. */
const binaryFor = async (fixture: FixtureHandle): Promise<TurboBinary> => {
  const binary = await resolveTurbo(fixture.dir, { ...TRUSTED, overridePath: devTurboPath() });

  spawns.files.length = 0;

  return binary;
};

/** `readCachedWorkspace` from a new module graph: its memory map is empty, as after a restart. */
const freshReader = async (): Promise<CacheReader> => {
  vi.resetModules();
  // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
  const fresh = await import('../index.ts');

  return fresh.readCachedWorkspace;
};

/** The file's text, or `null` when it is missing; a missing file is first created empty. */
const ensureFile = async (path: string): Promise<string | null> => {
  try {
    return await readFile(path, 'utf8');
  } catch {
    await writeFile(path, '');

    return null;
  }
};

/** Puts back the text `ensureFile` returned: a file it created is removed. */
const restoreFile = async (path: string, text: string | null): Promise<void> => {
  if (text === null) return rm(path);

  return writeFile(path, text);
};

describe('FEATURE: workspace cache from a real turbo', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cache-contract-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a target-like copy loaded with a cache dir', () => {
    const fixture = fixtureHook(targetLike);
    let cacheDir = '';
    let binary: TurboBinary;
    let loaded: WorkspaceModel;

    beforeAll(async () => {
      cacheDir = newCacheDir();
      binary = await binaryFor(fixture());
      await backdateTree(fixture().dir, AGE_MS);
      loaded = await loadWorkspace(binary, { cacheDir });
      spawns.files.length = 0;
    });

    describe('WHEN a restarted process reads the cache', () => {
      let read: SettledRead | null;

      beforeAll(async () => {
        const reader = await freshReader();
        const cached = await reader(binary.root, cacheDir);

        read = await settledRead(cached, binary);
      });

      it('THEN it is fresh with the loaded model', () => {
        const expected: SettledRead = { model: loaded, isFresh: true };

        expect(read).toStrictEqual(expected);
      });

      it('THEN turbo is not spawned', () => {
        expect(turboSpawns(binary)).toBe(0);
      });
    });
  });

  describe('GIVEN a target-like copy loaded with a cache dir, then one keyed file edited', () => {
    const fixture = fixtureHook(targetLike);
    const originals = new Map<string, string | null>();
    let cacheDir = '';
    let binary: TurboBinary;

    beforeAll(async () => {
      cacheDir = newCacheDir();
      binary = await binaryFor(fixture());
    });

    afterEach(async () => {
      for (const [path, text] of originals) await restoreFile(path, text);

      originals.clear();
    });

    it.each(STALE_FILES)('WHEN %s gains a line THEN the read turns stale and still returns the model', async (file) => {
      const path = join(fixture().dir, file);
      const original = await ensureFile(path);

      originals.set(path, original);
      await backdateTree(fixture().dir, AGE_MS);

      const model = await loadWorkspace(binary, { cacheDir });
      const cachedBefore = await readCachedWorkspace(binary.root, cacheDir);
      const before = await settledRead(cachedBefore, binary);
      const fresh: SettledRead = { model, isFresh: true };
      const stale: SettledRead = { model, isFresh: false };

      await appendFile(path, '\n');

      const cachedAfter = await readCachedWorkspace(binary.root, cacheDir);
      const after = await settledRead(cachedAfter, binary);

      expect(before).toStrictEqual(fresh);
      expect(after).toStrictEqual(stale);
    });
  });

  describe('GIVEN a target-like copy loaded with a cache dir whose file is then truncated', () => {
    const fixture = fixtureHook(targetLike);

    it('WHEN a restarted process reads the cache THEN it is null, where it was fresh before the truncation', async () => {
      const cacheDir = newCacheDir();
      const binary = await binaryFor(fixture());

      await backdateTree(fixture().dir, AGE_MS);

      const model = await loadWorkspace(binary, { cacheDir });
      const readerBefore = await freshReader();
      const cachedBefore = await readerBefore(binary.root, cacheDir);
      const before = await settledRead(cachedBefore, binary);
      const fresh: SettledRead = { model, isFresh: true };

      await writeFile(join(cacheDir, cacheFileName(binary.root)), '{');

      const reader = await freshReader();

      const read = await reader(binary.root, cacheDir);

      expect(before).toStrictEqual(fresh);
      expect(read).toBeNull();
    });
  });

  describe('GIVEN a target-like copy loaded with a cache dir, then the loaded model changed by the caller', () => {
    const fixture = fixtureHook(targetLike);

    it('WHEN the cache is read from memory THEN it is fresh with the model as loaded', async () => {
      const cacheDir = newCacheDir();
      const binary = await binaryFor(fixture());

      await backdateTree(fixture().dir, AGE_MS);

      const loaded = await loadWorkspace(binary, { cacheDir });
      const original = structuredClone(loaded);
      const fresh: SettledRead = { model: original, isFresh: true };

      loaded.warnings.push('changed');
      loaded.packages.reverse();

      const cached = await readCachedWorkspace(binary.root, cacheDir);
      const read = await settledRead(cached, binary);

      expect(read).toStrictEqual(fresh);
    });
  });

  describe('GIVEN a target-like copy and a cache dir that is an existing file', () => {
    const fixture = fixtureHook(targetLike);
    let cacheDir = '';
    let binary: TurboBinary;
    let loaded: WorkspaceModel;

    beforeAll(async () => {
      cacheDir = newCacheDir();
      binary = await binaryFor(fixture());
      await mkdir(dirname(cacheDir), { recursive: true });
      await writeFile(cacheDir, '');
      loaded = await loadWorkspace(binary, { cacheDir });
    });

    it('WHEN loaded THEN it resolves with exactly one warning, a cache one', () => {
      expect(loaded.warnings).toHaveLength(1);
      expect(loaded.warnings[0]).toMatch(/^cache: /);
    });

    it('WHEN the cache is then read from memory THEN its model carries no cache warning', async () => {
      const read = await readCachedWorkspace(binary.root, cacheDir);

      expect(read?.model.warnings).toStrictEqual([]);
    });
  });

  describe('GIVEN a target-like copy whose root package.json is written just before the load', () => {
    const fixture = fixtureHook(targetLike);

    it('WHEN the cache is then read THEN it is stale', async () => {
      const cacheDir = newCacheDir();
      const binary = await binaryFor(fixture());

      await backdateTree(fixture().dir, AGE_MS);

      const now = new Date();

      await utimes(join(fixture().dir, 'package.json'), now, now);
      await loadWorkspace(binary, { cacheDir });

      const read = await readCachedWorkspace(binary.root, cacheDir);
      const isFresh = await read?.isFresh(binary);

      expect(isFresh).toBe(false);
    });
  });

  describe('GIVEN a target-like copy never loaded and an empty cache dir', () => {
    const fixture = fixtureHook(targetLike);

    it('WHEN the cache is read THEN it is null', async () => {
      const cacheDir = newCacheDir();
      const binary = await binaryFor(fixture());

      await mkdir(cacheDir, { recursive: true });

      const read = await readCachedWorkspace(binary.root, cacheDir);

      expect(read).toBeNull();
    });
  });
});
