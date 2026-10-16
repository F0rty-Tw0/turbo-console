import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { PACKAGE_GRAPH_QUERY, loadWorkspace, packageGraphSchema, readDryRun, resolveTurbo } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { DryRunState, PackageGraph, TaskNode, TurboBinary, WorkspaceModel } from '../index.ts';
import type { PersistentVariant } from './test/common/persistent-fixture.type.ts';
import { writePersistentFixture } from './test/utils/persistent-fixture.spec.util.ts';
import { queryTurbo } from '../shared/turbo/data-access/query-turbo.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { commandTaskNames } from '../shared/turbo/test/utils/package-graph.spec.util.ts';

/** Every task name a fixture package has a script for: one dry run of all of them covers every package. */
const ALL_TASKS = ['build', 'dev', 'serve', 'watch', 'lint', 'start', 'zap', 'keep', 'z2', 'z3'];

/** Scripts whose task an `extends: false` entry of the target's chain drops: turbo query lists them, turbo run does not. */
const NOT_TURBO_IDS = ['web1#zap', 'web2#zap', 'web4#zap', 'web7#z3', 'web8#z2'];

/** The task P1d's root `@p/b#dev` key changes: `true` from the bare root `dev` in P1, `false` from the key in P1d. */
const P1D_TASK_ID = '@p/b#dev';

const VARIANTS: [PersistentVariant, boolean][] = [
  ['p1', true],
  ['p1d', false]
];

const graphOf = async (binary: TurboBinary): Promise<PackageGraph> => {
  const result = await queryTurbo(binary.path, PACKAGE_GRAPH_QUERY, binary.root);
  const json: unknown = JSON.parse(result.stdout);

  return packageGraphSchema.parse(json);
};

const tasksOf = (model: WorkspaceModel): TaskNode[] => model.packages.flatMap((pkg) => pkg.tasks);

const isTurbo = (task: TaskNode): boolean => task.isTurboTask;

const isNotTurbo = (task: TaskNode): boolean => !task.isTurboTask;

const idOf = (item: TaskNode | DryRunState): string => item.id;

const taskPersistent = (task: TaskNode): [string, boolean] => [task.id, task.persistent];

const statePersistent = (state: DryRunState): [string, boolean] => [state.id, state.definition.persistent];

describe('FEATURE: persistent and isTurboTask against turbo 2.11.7', () => {
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'persistent-contract-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe.each(VARIANTS)('GIVEN the spec §5.2 probe fixture with the %s root config', (variant, bDevPersistent) => {
    let graph: PackageGraph;
    let model: WorkspaceModel;
    let states: DryRunState[];

    beforeAll(async () => {
      const root = await writePersistentFixture(tempDir, variant);
      const binary = await resolveTurbo(root, { trusted: true, overridePath: devTurboPath() });

      graph = await graphOf(binary);
      model = await loadWorkspace(binary);
      states = await readDryRun(binary, { tasks: ALL_TASKS });
    });

    it('WHEN loaded THEN the model holds every task the package-graph query lists', () => {
      const ids = tasksOf(model).map(idOf);

      expect(ids.toSorted()).toStrictEqual(commandTaskNames(graph));
    });

    it('WHEN loaded THEN the turbo tasks are the ones a dry run of every name returns', () => {
      const ids = tasksOf(model).filter(isTurbo).map(idOf);
      const stateIds = states.map(idOf);

      expect(ids.toSorted()).toStrictEqual(stateIds.toSorted());
    });

    it('WHEN loaded THEN only the scripts a chain excludes are not turbo tasks', () => {
      const ids = tasksOf(model).filter(isNotTurbo).map(idOf);

      expect(ids.toSorted()).toStrictEqual(NOT_TURBO_IDS.toSorted());
    });

    it('WHEN loaded THEN each turbo task is persistent exactly when the dry run resolves it so', () => {
      const persistent = tasksOf(model).filter(isTurbo).map(taskPersistent);
      const resolved = states.map(statePersistent);

      expect(new Map(persistent)).toStrictEqual(new Map(resolved));
    });

    it(`WHEN loaded THEN ${P1D_TASK_ID} is persistent only without the P1d root key`, () => {
      const task = tasksOf(model).find((candidate) => candidate.id === P1D_TASK_ID);

      expect(task?.persistent).toBe(bDevPersistent);
    });
  });
});
