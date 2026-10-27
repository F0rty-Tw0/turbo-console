import { describe, expect, it } from 'vitest';

import { buildWorkspaceModel } from './workspace-model.util.ts';
import type { GraphPackage } from '../../shared/turbo/common/turbo.type.ts';
import type { TaskPresence, TurboConfigFile, TurboConfigOk } from '../common/turbo-config.type.ts';
import type { ModelSource, TaskNode, WorkspaceModel } from '../common/workspace-model.type.ts';
import { MODEL_SOURCE_STUB } from '../test/stubs/model-source.stub.ts';
import { configError } from '../test/utils/config-error.spec.util.ts';
import { graphPackage, graphTask, packageGraph } from '../test/utils/graph.spec.util.ts';

const COMMAND = 'node -e 0';

const configOf = (path: string, tasks: Record<string, TaskPresence>, extendsNames: string[]): TurboConfigOk => {
  const config: TurboConfigOk = {
    path,
    descriptions: {},
    tasks,
    persistent: {},
    extends: extendsNames,
    affectedUsingTaskInputs: false
  };

  return config;
};

const ROOT = configOf('turbo.json', { build: 'defined' }, []);

const BUILD = graphTask('a#build', COMMAND, [], []);

const LINT = graphTask('a#lint', COMMAND, [], []);

const PKG_A = graphPackage('a', 'packages/a', [], [BUILD, LINT]);

const DEFS = graphPackage('defs', 'tools/defs', ['atomizer:definitions'], [graphTask('defs#gen', COMMAND, [], [])]);

const BUILD_DEV_ROOT = configOf('turbo.json', { build: 'defined', dev: 'defined' }, []);

const DEV_PERSISTENT: Record<string, boolean> = { dev: true };

const CONTINUOUS_ROOT: TurboConfigOk = { ...BUILD_DEV_ROOT, persistent: DEV_PERSISTENT };

const C_TASKS = [graphTask('c#build', COMMAND, [], []), graphTask('c#dev', COMMAND, [], []), graphTask('c#lint', COMMAND, [], [])];

const PKG_C = graphPackage('c', 'packages/c', [], C_TASKS);

const PKG_X = graphPackage('x', 'packages/x', [], [graphTask('x#gen', COMMAND, [], [])]);

const build = (packages: GraphPackage[], configs: TurboConfigFile[]): WorkspaceModel => {
  const graph = packageGraph(packages, []);

  return buildWorkspaceModel(graph, configs, MODEL_SOURCE_STUB);
};

const SINGLE_SOURCE: ModelSource = { ...MODEL_SOURCE_STUB, singlePackage: true, rootLabel: 'single-app' };

const ROOT_TASKS = [
  graphTask('//#build', COMMAND, [], []),
  graphTask('//#dev', COMMAND, [], []),
  graphTask('//#format', COMMAND, [], [])
];

const ROOT_PACKAGE = graphPackage('//', '', [], ROOT_TASKS);

const buildSingle = (rootPackage: GraphPackage, configs: TurboConfigFile[] = [CONTINUOUS_ROOT]): WorkspaceModel => {
  const graph = packageGraph([rootPackage], [], rootPackage);

  return buildWorkspaceModel(graph, configs, SINGLE_SOURCE);
};

const rowOf = (task: TaskNode): [string, boolean, boolean] => [task.id, task.isTurboTask, task.persistent];

const taskOf = (model: WorkspaceModel, id: string): TaskNode | undefined => {
  const tasks = model.packages.flatMap((pkg) => pkg.tasks);

  return tasks.find((candidate) => candidate.id === id);
};

const isTurboTaskOf = (model: WorkspaceModel, id: string): boolean | undefined => taskOf(model, id)?.isTurboTask;

const persistentOf = (model: WorkspaceModel, id: string): boolean | undefined => taskOf(model, id)?.persistent;

describe('FEATURE: workspace model turbo tasks', () => {
  describe('GIVEN a root config defining build and a package whose lint script no config defines', () => {
    const model = build([PKG_A], [ROOT]);

    it('WHEN built THEN build is a turbo task', () => {
      expect(isTurboTaskOf(model, 'a#build')).toBe(true);
    });

    it('WHEN built THEN lint is not a turbo task', () => {
      expect(isTurboTaskOf(model, 'a#lint')).toBe(false);
    });
  });

  describe('GIVEN a package whose config extends a hidden definitions package', () => {
    it('WHEN built THEN the task that package defines is a turbo task', () => {
      const configs = [
        ROOT,
        configOf('tools/defs/turbo.json', { gen: 'defined' }, ['//']),
        configOf('packages/x/turbo.json', {}, ['//', 'defs'])
      ];

      const model = build([PKG_X, DEFS], configs);

      expect(isTurboTaskOf(model, 'x#gen')).toBe(true);
    });
  });

  describe('GIVEN a root config with a continuous dev and a plain build', () => {
    const model = build([PKG_C], [CONTINUOUS_ROOT]);

    it('WHEN built THEN the dev node is persistent', () => {
      expect(persistentOf(model, 'c#dev')).toBe(true);
    });

    it('WHEN built THEN the build node is not persistent', () => {
      expect(persistentOf(model, 'c#build')).toBe(false);
    });

    it('WHEN built THEN the lint script no config defines is not persistent', () => {
      expect(persistentOf(model, 'c#lint')).toBe(false);
    });
  });

  describe('GIVEN a root config that did not parse', () => {
    const model = build([PKG_A], [configError('turbo.json')]);

    it('WHEN built THEN every task counts as a turbo task', () => {
      expect(isTurboTaskOf(model, 'a#lint')).toBe(true);
    });

    it('WHEN built THEN no task is persistent', () => {
      expect(persistentOf(model, 'a#lint')).toBe(false);
    });
  });

  describe('GIVEN a single-package source with a // package of build, dev and an unkeyed format', () => {
    const model = buildSingle(ROOT_PACKAGE);

    it('WHEN built THEN it is single-package with one labelled // package and no edges', () => {
      expect(model.singlePackage).toBe(true);
      expect(model.edges).toStrictEqual([]);
      expect(model.packages).toMatchObject([{ name: '//', path: '', label: 'single-app' }]);
    });

    it('WHEN built THEN keyed build and dev are turbo tasks, unkeyed format is a script, and only dev is persistent', () => {
      const rows = model.packages.flatMap((pkg) => pkg.tasks).map(rowOf);

      expect(rows).toStrictEqual([
        ['//#build', true, false],
        ['//#dev', true, true],
        ['//#format', false, false]
      ]);
    });
  });

  describe('GIVEN a single-package source whose root config did not parse', () => {
    const model = buildSingle(ROOT_PACKAGE, [configError('turbo.json')]);

    it('WHEN built THEN every root task counts as a turbo task, unkeyed format included', () => {
      const rows = model.packages.flatMap((pkg) => pkg.tasks).map(rowOf);

      expect(rows).toStrictEqual([
        ['//#build', true, false],
        ['//#dev', true, false],
        ['//#format', true, false]
      ]);
    });
  });

  describe('GIVEN a single-package source whose // package has no tasks', () => {
    it('WHEN built THEN the model still holds one empty // package (spec §4.1)', () => {
      const emptyRoot = buildSingle(graphPackage('//', '', [], []));

      expect(emptyRoot.packages).toMatchObject([{ name: '//', path: '', label: 'single-app', tasks: [] }]);
    });
  });

  describe('GIVEN a monorepo graph', () => {
    it('WHEN built THEN singlePackage is false and every label is null', () => {
      const monorepo = build([PKG_A, PKG_C], [ROOT]);

      expect(monorepo.singlePackage).toBe(false);
      expect(monorepo.packages.map((pkg) => pkg.label)).toStrictEqual([null, null]);
    });
  });
});
