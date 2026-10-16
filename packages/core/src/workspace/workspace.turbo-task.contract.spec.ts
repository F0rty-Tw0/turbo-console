import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import type { FixtureHandle, Manifest, ManifestPackage } from '@turbo-console/repo-gen';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { TurboException, loadWorkspace, readDryRun, resolveTurbo } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { DryRunState, TaskNode, TurboBinary, WorkspaceModel } from '../index.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from '../shared/turbo/test/utils/fixture-hook.spec.util.ts';
import { leafPackage } from '../shared/turbo/test/utils/manifest.spec.util.ts';

/** A package.json script no turbo.json names: `turbo query` still lists it as a task. */
const ADHOC = 'adhoc';

const TRUSTED = { trusted: true } as const;

const scriptsSchema = z.record(z.string(), z.string()).optional();

const packageJsonSchema = z.looseObject({ scripts: scriptsSchema });

const binaryFor = async (fixture: FixtureHandle): Promise<TurboBinary> => {
  const binary = await resolveTurbo(fixture.dir, { ...TRUSTED, overridePath: devTurboPath() });

  return binary;
};

/** A task only the `gp` package config defines; no root key names it. */
const GRAND_TASK = 'gx';

/** A root task every regular package has a script for: `test` is never a phantom. */
const ROOT_TASK = 'test';

const EXCLUDED = { extends: false };

/** Adds the `name` script to `pkg`'s package.json and nothing else. */
const addScript = async (dir: string, pkg: ManifestPackage, name: string): Promise<void> => {
  const path = join(dir, pkg.path, 'package.json');
  const text = await readFile(path, 'utf8');
  const manifest = packageJsonSchema.parse(JSON.parse(text));
  const scripts = { ...manifest.scripts, [name]: 'node -e 0' };

  await writeFile(path, JSON.stringify({ ...manifest, scripts }));
};

/** Writes `pkg`'s `turbo.json`, extending the root, then `parents` in order. */
const writePackageTurbo = async (
  dir: string,
  pkg: ManifestPackage,
  parents: ManifestPackage[],
  tasks: Record<string, object>
): Promise<void> => {
  const parentNames = parents.map((parent) => parent.name);
  const config = { extends: ['//', ...parentNames], tasks };

  await writeFile(join(dir, pkg.path, 'turbo.json'), JSON.stringify(config));
};

/** The regular package at `index`; throws when the manifest has fewer, so a generator change cannot skip a case. */
const nthRegular = (manifest: Manifest, index: number): ManifestPackage => {
  const regulars = manifest.packages.filter((pkg) => pkg.role === 'regular');
  const found = regulars[index];

  if (found === undefined) throw new Error(`manifest has no regular package at ${index}`);

  return found;
};

const tasksOf = (model: WorkspaceModel): TaskNode[] => model.packages.flatMap((pkg) => pkg.tasks);

const isNotTurbo = (task: TaskNode): boolean => !task.isTurboTask;

const packageTasks = (model: WorkspaceModel, packageName: string): TaskNode[] => {
  const pkg = model.packages.find((candidate) => candidate.name === packageName);

  return pkg?.tasks ?? [];
};

/** `isTurboTask` of one task; `null` when the package has no such task. */
const turboFlagOf = (model: WorkspaceModel, packageName: string, taskName: string): boolean | null => {
  const task = packageTasks(model, packageName).find((candidate) => candidate.name === taskName);

  return task?.isTurboTask ?? null;
};

describe('FEATURE: turbo tasks of a real workspace', () => {
  describe('GIVEN a target-like copy whose leaf package gains a script no turbo.json names', () => {
    const fixture = fixtureHook(PRESETS['target-like']);
    let binary: TurboBinary;
    let leaf: ManifestPackage;
    let model: WorkspaceModel;

    beforeAll(async () => {
      leaf = leafPackage(fixture().manifest);
      await addScript(fixture().dir, leaf, ADHOC);
      binary = await binaryFor(fixture());
      model = await loadWorkspace(binary);
    });

    it('WHEN loaded THEN only that script is not a turbo task, atom tasks inherited through extends included', () => {
      const notTurbo = tasksOf(model).filter(isNotTurbo);

      expect(notTurbo.map((task) => task.id)).toStrictEqual([`${leaf.name}#${ADHOC}`]);
    });

    it('WHEN the package turbo tasks run dry THEN turbo returns a state for each', async () => {
      const tasks = packageTasks(model, leaf.name).filter((task) => task.isTurboTask);
      const names = tasks.map((task) => task.name);

      const states: DryRunState[] = await readDryRun(binary, { tasks: names, packages: [leaf.name] });

      const stateIds = states.map((state) => state.id);
      const taskIds = tasks.map((task) => task.id);

      expect(names.length).toBeGreaterThan(0);
      expect(stateIds).toStrictEqual(expect.arrayContaining(taskIds));
    });

    it('WHEN the script runs dry with them THEN turbo rejects the whole call', async () => {
      const names = packageTasks(model, leaf.name).map((task) => task.name);

      const reading = readDryRun(binary, { tasks: names, packages: [leaf.name] });

      await expect(reading).rejects.toBeInstanceOf(TurboException);
    });
  });

  describe('GIVEN a target-like copy whose parent package configs exclude a root task and a grandparent task', () => {
    const fixture = fixtureHook(PRESETS['target-like']);
    let binary: TurboBinary;
    let keepChild: ManifestPackage;
    let loseChild: ManifestPackage;
    let model: WorkspaceModel;

    beforeAll(async () => {
      const { dir, manifest } = fixture();
      const grandparent = nthRegular(manifest, 0);
      const keeper = nthRegular(manifest, 1);
      const excluder = nthRegular(manifest, 2);

      keepChild = nthRegular(manifest, 3);
      loseChild = nthRegular(manifest, 4);
      await writePackageTurbo(dir, grandparent, [], { [GRAND_TASK]: {} });
      await writePackageTurbo(dir, keeper, [grandparent], { [ROOT_TASK]: EXCLUDED });
      await writePackageTurbo(dir, excluder, [grandparent], { [GRAND_TASK]: EXCLUDED });
      await writePackageTurbo(dir, keepChild, [keeper], {});
      await writePackageTurbo(dir, loseChild, [excluder], {});
      await addScript(dir, keepChild, GRAND_TASK);
      await addScript(dir, loseChild, GRAND_TASK);
      binary = await binaryFor(fixture());
      model = await loadWorkspace(binary);
    });

    it('WHEN loaded THEN a child keeps the root task its parent excludes and inherits the grandparent task', () => {
      const flags = [turboFlagOf(model, keepChild.name, ROOT_TASK), turboFlagOf(model, keepChild.name, GRAND_TASK)];

      expect(flags).toStrictEqual([true, true]);
    });

    it('WHEN loaded THEN a child loses the grandparent task its parent excludes', () => {
      expect(turboFlagOf(model, loseChild.name, GRAND_TASK)).toBe(false);
    });

    it('WHEN the keeping child runs both tasks dry THEN turbo returns a state for each', async () => {
      const taskIds = [`${keepChild.name}#${ROOT_TASK}`, `${keepChild.name}#${GRAND_TASK}`];

      const states = await readDryRun(binary, { tasks: [ROOT_TASK, GRAND_TASK], packages: [keepChild.name] });

      const stateIds = states.map((state) => state.id);

      expect(stateIds).toStrictEqual(expect.arrayContaining(taskIds));
    });

    it('WHEN the losing child runs both tasks dry THEN turbo returns the root task state but none for the grandparent task', async () => {
      const states = await readDryRun(binary, { tasks: [ROOT_TASK, GRAND_TASK], packages: [loseChild.name] });

      const stateIds = states.map((state) => state.id);

      expect(stateIds).toContain(`${loseChild.name}#${ROOT_TASK}`);
      expect(stateIds).not.toContain(`${loseChild.name}#${GRAND_TASK}`);
    });
  });
});
