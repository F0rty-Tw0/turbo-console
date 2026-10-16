import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import type { FixtureHandle, ManifestPackage } from '@turbo-console/repo-gen';
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

/** Adds the `adhoc` script to `pkg`'s package.json and nothing else. */
const addAdhocScript = async (dir: string, pkg: ManifestPackage): Promise<void> => {
  const path = join(dir, pkg.path, 'package.json');
  const text = await readFile(path, 'utf8');
  const manifest = packageJsonSchema.parse(JSON.parse(text));
  const scripts = { ...manifest.scripts, [ADHOC]: 'node -e 0' };

  await writeFile(path, JSON.stringify({ ...manifest, scripts }));
};

const tasksOf = (model: WorkspaceModel): TaskNode[] => model.packages.flatMap((pkg) => pkg.tasks);

const isNotTurbo = (task: TaskNode): boolean => !task.isTurboTask;

const packageTasks = (model: WorkspaceModel, packageName: string): TaskNode[] => {
  const pkg = model.packages.find((candidate) => candidate.name === packageName);

  return pkg?.tasks ?? [];
};

describe('FEATURE: turbo tasks of a real workspace', () => {
  describe('GIVEN a target-like copy whose leaf package gains a script no turbo.json names', () => {
    const fixture = fixtureHook(PRESETS['target-like']);
    let binary: TurboBinary;
    let leaf: ManifestPackage;
    let model: WorkspaceModel;

    beforeAll(async () => {
      leaf = leafPackage(fixture().manifest);
      await addAdhocScript(fixture().dir, leaf);
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
});
