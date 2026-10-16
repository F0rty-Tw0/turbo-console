import { describe, expect, it } from 'vitest';

import { buildWorkspaceModel } from './workspace-model.util.ts';
import type { GraphPackage } from '../../shared/turbo/common/turbo.type.ts';
import type { TaskPresence, TurboConfigFile, TurboConfigOk } from '../common/turbo-config.type.ts';
import type { TaskNode, WorkspaceModel } from '../common/workspace-model.type.ts';
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

const PKG_X = graphPackage('x', 'packages/x', [], [graphTask('x#gen', COMMAND, [], [])]);

const build = (packages: GraphPackage[], configs: TurboConfigFile[]): WorkspaceModel => {
  const graph = packageGraph(packages, []);

  return buildWorkspaceModel(graph, configs, '2.11.7', '/repo');
};

const isTurboTaskOf = (model: WorkspaceModel, id: string): boolean | undefined => {
  const tasks = model.packages.flatMap((pkg) => pkg.tasks);
  const task: TaskNode | undefined = tasks.find((candidate) => candidate.id === id);

  return task?.isTurboTask;
};

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

  describe('GIVEN a root config that did not parse', () => {
    it('WHEN built THEN every task counts as a turbo task', () => {
      const model = build([PKG_A], [configError('turbo.json')]);

      expect(isTurboTaskOf(model, 'a#lint')).toBe(true);
    });
  });
});
