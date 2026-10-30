import { PRESETS } from '@turbo-console/repo-gen';
import type { FixtureSpec } from '@turbo-console/repo-gen';
import { beforeAll, describe, expect, it } from 'vitest';

import { packageGraphSchema } from './common/package-graph.schema.ts';
import { PACKAGE_GRAPH_QUERY } from './common/turbo-query.const.ts';
import type { PackageGraph, TurboResult } from './common/turbo.type.ts';
import { queryTurbo } from './data-access/query-turbo.ts';
import { devTurboPath } from './test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from './test/utils/fixture-hook.spec.util.ts';
import { manifestTaskNames } from './test/utils/manifest.spec.util.ts';

const TURBO = devTurboPath();

const TARGET_LIKE = PRESETS['target-like'];

const ROOT_TASK = { name: 'fmt', command: 'node -e 0', dependsOn: ['@fx/hub#build'] };

const ROOT_TASK_SPEC: FixtureSpec = { ...TARGET_LIKE, rootTask: ROOT_TASK };

const PHANTOM_TASK = /#task-\d+$/;

const parseGraph = (result: TurboResult): PackageGraph => {
  const json: unknown = JSON.parse(result.stdout);

  return packageGraphSchema.parse(json);
};

const packageOf = (fullName: string): string => fullName.slice(0, fullName.lastIndexOf('#'));

const directDependencyNames = (graph: PackageGraph, fullName: string): string[] => {
  const packages = graph.data.packageGraph.nodes.items;
  const tasks = packages.flatMap((pkg) => pkg.tasks.items);
  const task = tasks.find((candidate) => candidate.fullName === fullName);

  return task?.directDependencies.items.map((dependency) => dependency.fullName) ?? [];
};

describe('FEATURE: turbo root tasks and phantom dependencies on generated fixtures', () => {
  describe('GIVEN a fixture with the root task //#fmt queried for its package graph', () => {
    const fixture = fixtureHook(ROOT_TASK_SPEC);
    let graph: PackageGraph;

    beforeAll(async () => {
      const result = await queryTurbo(TURBO, PACKAGE_GRAPH_QUERY, fixture().dir);

      graph = parseGraph(result);
    });

    it('THEN root lists //#fmt with its command', () => {
      const fmt = graph.data.root?.tasks.items.find((task) => task.fullName === '//#fmt');

      expect(fmt?.command).toBe('node -e 0');
    });

    it('THEN //#fmt lists @fx/hub#build in directDependencies', () => {
      const fmt = graph.data.root?.tasks.items.find((task) => task.fullName === '//#fmt');

      const dependencies = fmt?.directDependencies.items.map((task) => task.fullName);

      expect(dependencies).toContain('@fx/hub#build');
    });

    it('THEN nodes.items has no // package', () => {
      const names = graph.data.packageGraph.nodes.items.map((pkg) => pkg.name);

      expect(names).not.toContain('//');
    });
  });

  describe('GIVEN the plain target-like fixture queried for its package graph', () => {
    const fixture = fixtureHook(TARGET_LIKE);
    let graph: PackageGraph;

    beforeAll(async () => {
      const result = await queryTurbo(TURBO, PACKAGE_GRAPH_QUERY, fixture().dir);

      graph = parseGraph(result);
    });

    it('THEN a phantom task-N lists its own package build in directDependencies', () => {
      const phantoms = manifestTaskNames(fixture().manifest, ['phantom']).filter((name) => PHANTOM_TASK.test(name));

      const missing = phantoms.filter((name) => !directDependencyNames(graph, name).includes(`${packageOf(name)}#build`));

      expect(phantoms.length).toBeGreaterThan(0);
      expect(missing).toStrictEqual([]);
    });
  });
});
