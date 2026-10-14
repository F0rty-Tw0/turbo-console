import { chmod, mkdir, mkdtemp, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fixtureFor, warmFixtureCache } from './fixture-for.ts';
import { PRESETS } from '../common/fixture.const.ts';
import type { FixtureHandle, FixtureSpec } from '../common/fixture.type.ts';
import { pathExists } from '../data-access/fixture-files.ts';
import { git } from '../data-access/git.ts';
import { fileTree } from '../test/utils/file-tree.spec.util.ts';
import { stubTempDir } from '../test/utils/temp-env.spec.util.ts';

const TARGET_LIKE = PRESETS['target-like'];

const CACHE_ROOT_NAME = `turbo-console-fixtures-${process.getuid?.() ?? 'user'}`;

const IS_WINDOWS = process.platform === 'win32';

const disposeOf = async (handle: FixtureHandle): Promise<void> => handle.dispose();

describe('FEATURE: cached fixture handles', () => {
  let root = '';
  let handles: FixtureHandle[] = [];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'repo-gen-cache-'));
    stubTempDir(root);
    handles = [];
  });

  afterEach(async () => {
    await Promise.all(handles.map(disposeOf));
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN an empty fixture cache', () => {
    describe('WHEN four callers ask for the same spec in parallel', () => {
      beforeEach(async () => {
        handles = await Promise.all([
          fixtureFor(TARGET_LIKE),
          fixtureFor(TARGET_LIKE),
          fixtureFor(TARGET_LIKE),
          fixtureFor(TARGET_LIKE)
        ]);
      });

      it('THEN each gets its own dir', () => {
        const dirs = new Set(handles.map((handle) => handle.dir));

        expect(dirs.size).toBe(4);
      });

      it('THEN the manifests are equal', () => {
        const [first, ...rest] = handles.map((handle) => handle.manifest);

        for (const manifest of rest) expect(manifest).toStrictEqual(first);
      });

      it('THEN every copy is a committed repo with the same files', async () => {
        const logs = await Promise.all(handles.map(async (handle) => git(handle.dir, ['log', '--format=%s'])));
        const trees = await Promise.all(handles.map(async (handle) => fileTree(handle.dir)));

        expect(logs).toStrictEqual(['base\n', 'base\n', 'base\n', 'base\n']);
        expect(trees.slice(1)).toStrictEqual([trees[0], trees[0], trees[0]]);
      });

      it('THEN exactly one cache entry is left and no temp generation dir remains', async () => {
        const entries = await readdir(join(root, CACHE_ROOT_NAME));

        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatch(/^[0-9a-f]{64}$/);
      });
    });
  });

  describe('GIVEN an empty fixture cache warmed for a spec', () => {
    beforeEach(async () => {
      await warmFixtureCache(TARGET_LIKE);
    });

    it('WHEN the warm-up resolves THEN the temp root holds only the cache, with one entry', async () => {
      const rootEntries = await readdir(root);
      const cacheEntries = await readdir(join(root, CACHE_ROOT_NAME));

      expect(rootEntries).toStrictEqual([CACHE_ROOT_NAME]);
      expect(cacheEntries).toHaveLength(1);
    });

    it('WHEN the spec is then requested THEN it is served from that entry', async () => {
      handles = [await fixtureFor(TARGET_LIKE)];
      const entries = await readdir(join(root, CACHE_ROOT_NAME));

      expect(entries).toHaveLength(1);
    });
  });

  describe('GIVEN two specs whose JSON differs only in key order, so they render the same repo', () => {
    it('WHEN both are requested THEN they share one cache entry', async () => {
      const { affectedUsingTaskInputs, ...rest } = TARGET_LIKE;
      const reordered: FixtureSpec = { affectedUsingTaskInputs, ...rest };

      handles = [await fixtureFor(TARGET_LIKE), await fixtureFor(reordered)];
      const entries = await readdir(join(root, CACHE_ROOT_NAME));

      expect(entries).toHaveLength(1);
    });
  });

  describe('GIVEN git is not on PATH', () => {
    it('WHEN a fixture is requested THEN it rejects and leaves no generation dir in the cache', async () => {
      vi.stubEnv('PATH', '');

      const request = fixtureFor(TARGET_LIKE);

      await expect(request).rejects.toThrow();
      expect(await readdir(join(root, CACHE_ROOT_NAME))).toStrictEqual([]);
    });
  });

  describe.skipIf(IS_WINDOWS)('GIVEN a pre-existing cache root that is not private', () => {
    it('WHEN it has group and other permission bits THEN the request rejects naming the root', async () => {
      await mkdir(join(root, CACHE_ROOT_NAME), { mode: 0o700 });
      await chmod(join(root, CACHE_ROOT_NAME), 0o755);

      const request = fixtureFor(TARGET_LIKE);

      await expect(request).rejects.toThrow(`${CACHE_ROOT_NAME} is not private`);
    });

    it('WHEN it is a symlink to a private dir THEN the request rejects', async () => {
      await mkdir(join(root, 'elsewhere'), { mode: 0o700 });
      await symlink(join(root, 'elsewhere'), join(root, CACHE_ROOT_NAME));

      const request = fixtureFor(TARGET_LIKE);

      await expect(request).rejects.toThrow(`${CACHE_ROOT_NAME} is not private`);
    });
  });

  describe('GIVEN a cached spec and a handle on it', () => {
    let first: FixtureHandle;

    beforeEach(async () => {
      first = await fixtureFor(TARGET_LIKE);
      handles = [first];
    });

    it('WHEN a second caller edits its copy THEN a third caller gets an untouched one', async () => {
      const second = await fixtureFor(TARGET_LIKE);

      handles.push(second);
      await rm(join(second.dir, 'package.json'));
      const third = await fixtureFor(TARGET_LIKE);

      handles.push(third);

      expect(await fileTree(third.dir)).toStrictEqual(await fileTree(first.dir));
    });

    it('WHEN the handle is disposed THEN its dir is gone and the cache still serves', async () => {
      await first.dispose();
      const exists = await pathExists(first.dir);
      const next = await fixtureFor(TARGET_LIKE);

      handles = [next];

      expect(exists).toBe(false);
      expect(await git(next.dir, ['log', '--format=%s'])).toBe('base\n');
    });
  });
});
