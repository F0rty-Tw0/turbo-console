import { describe, expect, it } from 'vitest';

import { declaresWorkspaces, singlePackageGraphOf } from './single-package.util.ts';
import type { PackageManagerName } from '../common/workspace-model.type.ts';
import { graphPackage, graphTask, packageGraph } from '../test/utils/graph.spec.util.ts';

type Row = {
  readonly title: string;
  readonly manager: PackageManagerName;
  readonly workspaces: unknown;
  readonly pnpmPackages: boolean;
  readonly expected: boolean;
};

const ROOT_PACKAGE = graphPackage('//', '', [], [graphTask('//#build', 'echo', [], [])]);

const LIST = ['packages/*'];

const PACKAGES_LIST = { packages: LIST };

const PACKAGES_EMPTY = { packages: [] };

const NOHOIST = { nohoist: ['x'] };

describe('FEATURE: the repo declares workspaces', () => {
  describe('GIVEN a package manager, its package.json workspaces value and the pnpm-workspace.yaml answer', () => {
    it.each<Row>([
      { title: 'pnpm with yaml packages', manager: 'pnpm', workspaces: undefined, pnpmPackages: true, expected: true },
      { title: 'pnpm without yaml packages', manager: 'pnpm', workspaces: undefined, pnpmPackages: false, expected: false },
      {
        title: 'pnpm with package.json workspaces only (ignored)',
        manager: 'pnpm',
        workspaces: LIST,
        pnpmPackages: false,
        expected: false
      },
      { title: 'npm without workspaces', manager: 'npm', workspaces: undefined, pnpmPackages: false, expected: false },
      { title: 'npm with workspaces []', manager: 'npm', workspaces: [], pnpmPackages: false, expected: false },
      { title: 'npm with workspaces packages/*', manager: 'npm', workspaces: LIST, pnpmPackages: false, expected: true },
      { title: 'npm with a pnpm yaml answer (ignored)', manager: 'npm', workspaces: undefined, pnpmPackages: true, expected: false },
      {
        title: 'yarn with { packages: [packages/*] }',
        manager: 'yarn',
        workspaces: PACKAGES_LIST,
        pnpmPackages: false,
        expected: true
      },
      { title: 'yarn with { packages: [] }', manager: 'yarn', workspaces: PACKAGES_EMPTY, pnpmPackages: false, expected: false },
      { title: 'yarn with an object without packages', manager: 'yarn', workspaces: NOHOIST, pnpmPackages: false, expected: false },
      { title: 'bun with workspaces [apps/*]', manager: 'bun', workspaces: ['apps/*'], pnpmPackages: false, expected: true },
      { title: 'npm with a string', manager: 'npm', workspaces: 'packages/*', pnpmPackages: false, expected: false },
      { title: 'npm with null', manager: 'npm', workspaces: null, pnpmPackages: false, expected: false }
    ])('WHEN $title THEN declaresWorkspaces is $expected', ({ manager, workspaces, pnpmPackages, expected }) => {
      expect(declaresWorkspaces(manager, workspaces, pnpmPackages)).toBe(expected);
    });
  });

  describe('GIVEN a graph with an empty node list and a root package', () => {
    it('WHEN the graph is derived THEN nodes is [root], edges is [], and root is kept', () => {
      const derived = singlePackageGraphOf(packageGraph([], [], ROOT_PACKAGE));

      expect(derived.data.packageGraph.nodes.items).toStrictEqual([ROOT_PACKAGE]);
      expect(derived.data.packageGraph.edges.items).toStrictEqual([]);
      expect(derived.data.root).toStrictEqual(ROOT_PACKAGE);
    });
  });

  describe('GIVEN a graph whose root is null', () => {
    it('WHEN the graph is derived THEN it is returned as is', () => {
      const graph = packageGraph([], [], null);

      expect(singlePackageGraphOf(graph)).toBe(graph);
    });
  });
});
