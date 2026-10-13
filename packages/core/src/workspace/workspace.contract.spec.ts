import type * as childProcess from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import type { FixtureHandle, FixtureSpec } from '@turbo-console/repo-gen';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { TurboException, loadWorkspace, resolveTurbo } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { TaskNode, TurboBinary, WorkspaceModel } from '../index.ts';
import { expectedModelOf, misplacedTaskIds, projectModel } from './test/utils/manifest-model.spec.util.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from '../shared/turbo/test/utils/fixture-hook.spec.util.ts';
import { manifestTaskNames } from '../shared/turbo/test/utils/manifest.spec.util.ts';

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

const FLAG_OFF: FixtureSpec = { ...targetLike, affectedUsingTaskInputs: false };

/** The 1000-package preset takes minutes to generate, so it runs only when asked for. */
const IS_STRESS = process.env['TURBO_CONSOLE_STRESS'] === '1';

const MODEL_PRESETS: [string, FixtureSpec][] = [
  ['target-like', targetLike],
  ['stretch-300', PRESETS['stretch-300']]
];

const STRESS_PRESETS: [string, FixtureSpec][] = [['stress', PRESETS.stress]];

const WITH_STRESS = [...MODEL_PRESETS, ...STRESS_PRESETS];

const PRESET_CASES = IS_STRESS ? WITH_STRESS : MODEL_PRESETS;

const ATOM_DEFINITIONS = 'tools/e2e-1-atoms/turbo.json';

/** Quoted, so the carrier `e2e-ci-src--tests/spec-001.spec.ts` is left alone (planning correction 5). */
const FILE_TASK_KEY = '"e2e-ci--tests/spec-001.spec.ts"';

const RENAMED_TASK = '@fx/e2e-1#renamed-spec';

const E2E_CONFIG = 'apps/e2e-1/turbo.json';

const DESCRIBED_TASK = '@fx/e2e-1#e2e-ci';

const E2E_CI_DESCRIPTION = 'Runs every e2e-ci spec';

const E2E_CI_ATOM = { group: 'e2e-ci' };

const E2E_CI_FILE_TASK = { kind: 'atom-file', atom: E2E_CI_ATOM };

const TRUSTED = { trusted: true } as const;

type PackageTurboJson = { tasks: Record<string, object> };

const allTasks = (model: WorkspaceModel): TaskNode[] => model.packages.flatMap((pkg) => pkg.tasks);

const taskKinds = (model: WorkspaceModel): string[] => allTasks(model).map((task) => task.kind);

const turboSpawns = (binary: TurboBinary): number => spawns.files.filter((file) => file === binary.path).length;

/** Resolves the dev turbo for `fixture`, then clears the spawn record its `--version` left. */
const binaryFor = async (fixture: FixtureHandle): Promise<TurboBinary> => {
  const binary = await resolveTurbo(fixture.dir, { ...TRUSTED, overridePath: devTurboPath() });

  spawns.files.length = 0;

  return binary;
};

/** Renames the file task in the definitions `turbo.json`, key and `e2e-ci--all` entry alike, keeping its tags. */
const renameFileTask = async (dir: string): Promise<void> => {
  const path = join(dir, ATOM_DEFINITIONS);
  const text = await readFile(path, 'utf8');

  await writeFile(path, text.replaceAll(FILE_TASK_KEY, '"renamed-spec"'));
};

/** Gives `e2e-ci` a description in its own package `turbo.json`, where only the package config can supply it. */
const describeE2eCi = async (dir: string): Promise<void> => {
  const path = join(dir, E2E_CONFIG);
  const config = JSON.parse(await readFile(path, 'utf8')) as PackageTurboJson;
  const described = { ...config.tasks['e2e-ci'], description: E2E_CI_DESCRIPTION };
  const tasks = { ...config.tasks, 'e2e-ci': described };

  await writeFile(path, JSON.stringify({ ...config, tasks }));
};

describe('FEATURE: workspace model from a real turbo', () => {
  describe.each(PRESET_CASES)('GIVEN a %s fixture', (_name, spec) => {
    const fixture = fixtureHook(spec);
    let binary: TurboBinary;
    let model: WorkspaceModel;

    beforeAll(async () => {
      binary = await binaryFor(fixture());
      model = await loadWorkspace(binary);
    });

    it('WHEN loaded THEN packages, tasks and edges equal the manifest', () => {
      const projection = projectModel(model);

      expect(projection).toStrictEqual(expectedModelOf(fixture().manifest));
    });

    it('WHEN loaded THEN each task sits in the package its id names', () => {
      expect(misplacedTaskIds(model)).toStrictEqual([]);
    });

    it('WHEN loaded THEN the model has no warnings', () => {
      expect(model.warnings).toStrictEqual([]);
    });

    it('WHEN loaded THEN root and turboVersion come from the binary', () => {
      expect(model).toMatchObject({ root: binary.root, turboVersion: binary.version });
    });

    it('WHEN loaded THEN turbo was spawned exactly once', () => {
      expect(turboSpawns(binary)).toBe(1);
    });
  });

  describe('GIVEN a target-like fixture (AC2)', () => {
    const fixture = fixtureHook(targetLike);
    let binary: TurboBinary;
    let model: WorkspaceModel;

    beforeAll(async () => {
      binary = await binaryFor(fixture());
      model = await loadWorkspace(binary);
    });

    beforeEach(() => {
      spawns.files.length = 0;
    });

    it('WHEN loaded THEN no carrier or phantom task is in the model', () => {
      const hidden = new Set(manifestTaskNames(fixture().manifest, ['carrier', 'phantom']));

      const shown = allTasks(model).filter((task) => hidden.has(task.id));

      expect(hidden.size).toBeGreaterThan(0);
      expect(shown).toStrictEqual([]);
    });

    it('WHEN loaded THEN no atom-definitions package is in the model', () => {
      const definitions = fixture().manifest.packages.filter((pkg) => pkg.role === 'atom-definitions');
      const names = new Set(model.packages.map((pkg) => pkg.name));

      const shown = definitions.filter((pkg) => names.has(pkg.name));

      expect(definitions.length).toBeGreaterThan(0);
      expect(shown).toStrictEqual([]);
    });

    it('WHEN loaded THEN it has an atom umbrella and an atom aggregate', () => {
      const kinds = taskKinds(model);

      expect(kinds).toContain('atom-umbrella');
      expect(kinds).toContain('atom-aggregate');
    });

    it('WHEN loaded THEN affected mode is task', () => {
      expect(model.affectedMode).toBe('task');
    });

    it('WHEN the caller signal is already aborted THEN it rejects failed, aborted, without spawning turbo', async () => {
      const loading = loadWorkspace(binary, { signal: AbortSignal.abort() });

      await expect(loading).rejects.toBeInstanceOf(TurboException);
      await expect(loading).rejects.toMatchObject({ kind: 'failed' });
      await expect(loading).rejects.toThrow('aborted');
      expect(turboSpawns(binary)).toBe(0);
    });
  });

  describe('GIVEN a target-like copy with one file task renamed, its tag kept', () => {
    const fixture = fixtureHook(targetLike);
    let model: WorkspaceModel;

    beforeAll(async () => {
      await renameFileTask(fixture().dir);
      const binary = await binaryFor(fixture());

      model = await loadWorkspace(binary);
    });

    it('WHEN loaded THEN the renamed task is an atom-file of its group', () => {
      const renamed = allTasks(model).find((task) => task.id === RENAMED_TASK);

      expect(renamed).toMatchObject(E2E_CI_FILE_TASK);
    });
  });

  describe('GIVEN a target-like copy with a description in a package turbo.json', () => {
    const fixture = fixtureHook(targetLike);
    let model: WorkspaceModel;

    beforeAll(async () => {
      await describeE2eCi(fixture().dir);
      const binary = await binaryFor(fixture());

      model = await loadWorkspace(binary);
    });

    it('WHEN loaded THEN the task carries the package config description', () => {
      const described = allTasks(model).find((task) => task.id === DESCRIBED_TASK);

      expect(described).toMatchObject({ description: E2E_CI_DESCRIPTION });
    });
  });

  describe('GIVEN a target-like fixture with affectedUsingTaskInputs off', () => {
    const fixture = fixtureHook(FLAG_OFF);

    it('WHEN loaded THEN affected mode is package', async () => {
      const binary = await binaryFor(fixture());

      const model = await loadWorkspace(binary);

      expect(model.affectedMode).toBe('package');
    });
  });
});
