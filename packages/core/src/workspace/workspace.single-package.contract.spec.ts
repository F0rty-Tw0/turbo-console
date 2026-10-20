import type * as childProcess from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { loadWorkspace, readDryRun, resolveTurbo } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { CachedWorkspace, TurboBinary, WorkspaceModel } from '../index.ts';
import { writeEmptyWorkspaceFixture, writeSinglePackageFixture } from './test/utils/single-package-fixture.spec.util.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from '../shared/turbo/test/utils/fixture-hook.spec.util.ts';

type CacheReader = (root: string, cacheDir: string) => Promise<CachedWorkspace | null>;

type TaskRow = [id: string, isTurboTask: boolean, persistent: boolean];

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

const ROOT_ROW = { name: '//', path: '', label: 'single-app' };

const CACHED_ROOT_ROW = { label: 'single-app' };

const TRUSTED = { trusted: true } as const;

const ALL_FIVE = ['build', 'dev', 'format', 'lint', 'test:unit'];

const turboSpawns = (binary: TurboBinary): number => spawns.files.filter((file) => file === binary.path).length;

/** Resolves the dev turbo for `root`, then clears the spawn record its `--version` left: that spawn is not a load spawn. */
const binaryFor = async (root: string): Promise<TurboBinary> => {
  const binary = await resolveTurbo(root, { ...TRUSTED, overridePath: devTurboPath() });

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

const rowsOf = (model: WorkspaceModel): TaskRow[] => {
  const tasks = model.packages[0]?.tasks ?? [];
  const toRow = (task: WorkspaceModel['packages'][number]['tasks'][number]): TaskRow => [task.id, task.isTurboTask, task.persistent];

  return tasks.map(toRow);
};

describe('FEATURE: load a workspace from a real turbo in each repo shape', () => {
  let tempDir = '';
  let caseCount = 0;

  /** A new, not yet created cache dir, its name holding a space. */
  const newCacheDir = (): string => {
    caseCount += 1;

    return join(tempDir, `cache ${caseCount}`);
  };

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'single-contract-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN the single-package fixture, loaded with a cacheDir', () => {
    let cacheDir = '';
    let root = '';
    let binary: TurboBinary;
    let model: WorkspaceModel;
    let loadSpawns = 0;

    beforeAll(async () => {
      cacheDir = newCacheDir();
      root = await writeSinglePackageFixture(tempDir);
      binary = await binaryFor(root);
      model = await loadWorkspace(binary, { cacheDir });
      loadSpawns = turboSpawns(binary);
    });

    it('THEN one package { name: //, path: "", label: single-app }, singlePackage true', () => {
      expect(model).toMatchObject({ singlePackage: true, packages: [ROOT_ROW] });
    });

    it('THEN build dev format lint test:unit are all turbo tasks and only dev is persistent', () => {
      expect(rowsOf(model)).toStrictEqual([
        ['//#build', true, false],
        ['//#dev', true, true],
        ['//#format', true, false],
        ['//#lint', true, false],
        ['//#test:unit', true, false]
      ]);
    });

    it('THEN loading spawned turbo once: the query only, whatever the repo shape', () => {
      expect(loadSpawns).toBe(1);
    });

    it('THEN the turbo tasks and their persistent flags equal a --single-package dry run of all five filtered to //', async () => {
      const states = await readDryRun(binary, { tasks: ALL_FIVE, packages: ['//'], singlePackage: true });

      expect(rowsOf(model)).toStrictEqual(states.map((state) => [state.id, true, state.definition.persistent]));
    });

    it('WHEN read back from a fresh module graph THEN the cached model is single-package and no turbo is spawned', async () => {
      spawns.files.length = 0;

      const cached = await (await freshReader())(root, cacheDir);

      expect(cached?.model).toMatchObject({ singlePackage: true, packages: [CACHED_ROOT_ROW] });
      await expect(cached?.isFresh(binary)).resolves.toBe(true);
      expect(turboSpawns(binary)).toBe(0);
    });
  });

  describe('GIVEN the empty-workspace fixture (pnpm-workspace.yaml packages/*)', () => {
    let model: WorkspaceModel;
    let loadSpawns = 0;

    beforeAll(async () => {
      const binary = await binaryFor(await writeEmptyWorkspaceFixture(tempDir));

      model = await loadWorkspace(binary, { cacheDir: newCacheDir() });
      loadSpawns = turboSpawns(binary);
    });

    it('THEN no packages, singlePackage false, no warnings; one spawn', () => {
      expect(model).toMatchObject({ packages: [], singlePackage: false, warnings: [] });
      expect(loadSpawns).toBe(1);
    });
  });

  describe('GIVEN a target-like monorepo', () => {
    const fixture = fixtureHook(PRESETS['target-like']);
    let loadSpawns = 0;

    beforeAll(async () => {
      const binary = await binaryFor(fixture().dir);

      await loadWorkspace(binary, { cacheDir: newCacheDir() });
      loadSpawns = turboSpawns(binary);
    });

    it('THEN loading spawned turbo once, as before this feature', () => {
      expect(loadSpawns).toBe(1);
    });
  });
});
