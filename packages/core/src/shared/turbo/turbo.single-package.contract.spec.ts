import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { packageGraphSchema } from './common/package-graph.schema.ts';
import { PACKAGE_GRAPH_QUERY } from './common/turbo-query.const.ts';
import type { GraphTask, PackageGraph, QueryTurboOptions } from './common/turbo.type.ts';
import { queryTurbo } from './data-access/query-turbo.ts';
import { devTurboPath } from './test/utils/dev-turbo.spec.util.ts';
import {
  writeEdgesFixture,
  writeEmptyWorkspaceFixture,
  writeSinglePackageFixture
} from '../../workspace/test/utils/single-package-fixture.spec.util.ts';

const fullNameOf = (task: GraphTask): string => task.fullName;

type TaskRef = GraphTask['directDependencies']['items'][number];

const refNameOf = (ref: TaskRef): string => ref.fullName;

const depsOf = (graph: PackageGraph, id: string): string[] | undefined => {
  const task = graph.data.root?.tasks.items.find((item) => item.fullName === id);

  return task?.directDependencies.items.map(refNameOf).toSorted();
};

const queryGraph = async (root: string, options: QueryTurboOptions = {}): Promise<PackageGraph> => {
  const result = await queryTurbo(devTurboPath(), PACKAGE_GRAPH_QUERY, root, options);
  const json: unknown = JSON.parse(result.stdout);

  return packageGraphSchema.parse(json);
};

describe('FEATURE: turbo package graph query on single-package shapes', () => {
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'turbo-single-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('GIVEN the single-package fixture', () => {
    let graph: PackageGraph;

    beforeAll(async () => {
      graph = await queryGraph(await writeSinglePackageFixture(tempDir));
    });

    it('THEN nodes.items is empty', () => {
      expect(graph.data.packageGraph.nodes.items).toStrictEqual([]);
    });

    it('THEN root is // at path "" with its scripts in query order', () => {
      const names = graph.data.root?.tasks.items.map(fullNameOf);

      expect(graph.data.root).toMatchObject({ name: '//', path: '' });
      expect(names).toStrictEqual(['//#build', '//#dev', '//#format', '//#lint', '//#test:unit']);
    });
  });

  describe('GIVEN the empty-workspace fixture', () => {
    let graph: PackageGraph;

    beforeAll(async () => {
      graph = await queryGraph(await writeEmptyWorkspaceFixture(tempDir));
    });

    it('THEN nodes.items is empty and root lists its two scripts', () => {
      const names = graph.data.root?.tasks.items.map(fullNameOf);

      expect(graph.data.packageGraph.nodes.items).toStrictEqual([]);
      expect(names).toStrictEqual(['//#build', '//#lint']);
    });
  });

  describe('GIVEN the edges fixture', () => {
    let root = '';

    beforeAll(async () => {
      root = await writeEdgesFixture(tempDir);
    });

    it('WHEN queried without the option THEN //#build has no dependencies (the bug)', async () => {
      const plain = await queryGraph(root);

      expect(depsOf(plain, '//#build')).toStrictEqual([]);
    });

    it('WHEN queried with singlePackage THEN //#build lists format lint typecheck', async () => {
      const single = await queryGraph(root, { singlePackage: true });

      expect(depsOf(single, '//#build')).toStrictEqual(['//#format', '//#lint', '//#typecheck']);
    });
  });
});
