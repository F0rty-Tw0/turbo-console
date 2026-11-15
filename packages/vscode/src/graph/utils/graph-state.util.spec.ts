import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphPackage, GraphState, GraphTask, Positions } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOf, rootLabelOf, rootPackageLabelOf } from './graph-state.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { GraphLayoutCacheEntry, GraphLayoutCaches } from '../common/graph-cache.type.ts';
import {
  GRAPH_HASH_STUB,
  GRAPH_MODEL_STUB,
  GRAPH_SHOWN_STUB,
  GRAPH_STATE_STUB,
  NO_LAYOUT_CACHES_STUB,
  POSITIONS_STUB
} from '../test/stubs/graph-model.stub.ts';
import { graphPackageOf, rootNode } from '../test/utils/graph-model.spec.util.ts';

const ROOT_FIRST_NAMES = [{ name: '//' }, { name: '@org/x' }, { name: 'a' }, { name: 'web' }];
const PROTO_NAMES = [{ name: '__proto__', tags: ['constructor'] }];
const SCOPED_BASE = graphPackageOf('@org/x', 'packages/libs/x', [], 1);
const SCOPED_INFO: GraphPackage = { ...SCOPED_BASE, bareName: 'x' };
const GRAPH_INFOS = [SCOPED_INFO, graphPackageOf('a', 'packages/a', [], 1), graphPackageOf('web', 'apps/web', ['app', 'ui'], 2)];
const CACHE: GraphLayoutCacheEntry = { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB, routes: {} };
const STALE: GraphLayoutCacheEntry = { hash: 'ffffffff', positions: POSITIONS_STUB, routes: {} };
const GHOST_POINT = { x: 1, y: 1 };
const GHOST_POSITIONS = { ...POSITIONS_STUB, ghost: GHOST_POINT };
const GHOSTED: GraphLayoutCacheEntry = { hash: GRAPH_HASH_STUB, positions: GHOST_POSITIONS, routes: {} };
const ROOT_TASK: TaskNode = { ...TASK_NODE_STUB, id: '//#build', name: 'build' };
const ROOT_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', label: 'single-app', tasks: [ROOT_TASK] };
const ROOT_INFOS = [{ name: '//', path: '' }];
const SINGLE_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true, packages: [ROOT_NODE] };
const GROWN_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [...GRAPH_MODEL_STUB.packages, rootNode('new')] };

const FLAT_ONLY: GraphLayoutCaches = { flat: CACHE, folders: null };
const FOLDERS_ONLY: GraphLayoutCaches = { flat: null, folders: CACHE };
const BOTH_FRESH: GraphLayoutCaches = { flat: CACHE, folders: CACHE };
const FLAT_STALE: GraphLayoutCaches = { flat: STALE, folders: CACHE };
const FOLDERS_GHOSTED: GraphLayoutCaches = { flat: CACHE, folders: GHOSTED };

type CacheCase = {
  readonly label: string;
  readonly model: WorkspaceModel;
  readonly caches: GraphLayoutCaches;
  readonly positions: Positions | null;
  readonly folderPositions: Positions | null;
};

const CACHE_CASES: CacheCase[] = [
  { label: 'flat only', model: GRAPH_MODEL_STUB, caches: FLAT_ONLY, positions: POSITIONS_STUB, folderPositions: null },
  { label: 'folders only', model: GRAPH_MODEL_STUB, caches: FOLDERS_ONLY, positions: null, folderPositions: POSITIONS_STUB },
  { label: 'both', model: GRAPH_MODEL_STUB, caches: BOTH_FRESH, positions: POSITIONS_STUB, folderPositions: POSITIONS_STUB },
  {
    label: 'flat stale, folders fresh',
    model: GRAPH_MODEL_STUB,
    caches: FLAT_STALE,
    positions: null,
    folderPositions: POSITIONS_STUB
  },
  {
    label: 'folders with an extra key',
    model: GRAPH_MODEL_STUB,
    caches: FOLDERS_GHOSTED,
    positions: POSITIONS_STUB,
    folderPositions: null
  },
  { label: 'both for a package added since', model: GROWN_MODEL, caches: BOTH_FRESH, positions: null, folderPositions: null }
];

const tasksOf = (state: GraphState): GraphTask[] => {
  if (state.kind !== 'graph') return [];

  return state.tasks;
};

describe('FEATURE: graph state builder', () => {
  describe('GIVEN a model with unsorted edges and one pair listed twice', () => {
    it('WHEN the state is built THEN each package carries its path and its tags sorted and deduplicated, and edges are sorted, deduped and carry no kind', () => {
      const state = graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(state).toStrictEqual(GRAPH_STATE_STUB);
    });
  });

  describe('GIVEN a package with two visible tasks and an atom-file one', () => {
    it('WHEN the state is built THEN taskCount counts the visible tasks only', () => {
      const state = graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(state).toMatchObject({ kind: 'graph', packages: GRAPH_INFOS });
    });
  });

  describe('GIVEN a model with one more task', () => {
    const extra: TaskNode = { ...TASK_NODE_STUB, id: 'a#lint', name: 'lint' };
    const withExtra = (node: PackageNode): PackageNode => {
      const isA = node.name === 'a';
      const grownNode: PackageNode = { ...node, tasks: [...node.tasks, extra] };

      return isA ? grownNode : node;
    };
    const grown = (): WorkspaceModel => {
      const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: GRAPH_MODEL_STUB.packages.map(withExtra) };

      return model;
    };

    it('WHEN the state is built THEN the hash is unchanged', () => {
      const state = graphStateOf(grown(), NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(state).toMatchObject({ hash: GRAPH_HASH_STUB });
    });

    it('WHEN the state is built THEN tasks has one more entry', () => {
      const base = tasksOf(graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB));

      const tasks = tasksOf(graphStateOf(grown(), NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB));

      expect(tasks).toHaveLength(base.length + 1);
    });
  });

  describe('GIVEN a monorepo model that lists the root // package', () => {
    it('WHEN the state is built THEN // is a package like any other', () => {
      const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [...GRAPH_MODEL_STUB.packages, rootNode('//')] };

      const state = graphStateOf(model, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(state).toMatchObject({ kind: 'graph', packages: ROOT_FIRST_NAMES });
    });
  });

  describe('GIVEN a single-package model', () => {
    it('WHEN the state is built THEN it is a graph with singlePackage and the root label', () => {
      const state = graphStateOf(SINGLE_MODEL, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(state).toMatchObject({ kind: 'graph', singlePackage: true, rootLabel: 'single-app', packages: ROOT_INFOS });
    });

    it('WHEN its root package has no label THEN rootLabel is null', () => {
      const unlabelled: PackageNode = { ...ROOT_NODE, label: null };
      const model: WorkspaceModel = { ...SINGLE_MODEL, packages: [unlabelled] };

      expect(graphStateOf(model, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB)).toMatchObject({ singlePackage: true, rootLabel: null });
    });

    it('WHEN the root label is read THEN it is the // package label', () => {
      expect(rootLabelOf(SINGLE_MODEL)).toBe('single-app');
    });
  });

  describe('GIVEN a monorepo model whose // package has a label', () => {
    const labelledRoot: PackageNode = { ...ROOT_NODE, label: 'labelled' };
    const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [labelledRoot] };

    it('WHEN the state is built THEN rootLabel is null', () => {
      expect(graphStateOf(model, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB)).toMatchObject({ singlePackage: false, rootLabel: null });
    });

    it('WHEN the root label is read THEN it is null', () => {
      expect(rootLabelOf(model)).toBeNull();
    });

    it('WHEN the // package label is read THEN it is the label', () => {
      expect(rootPackageLabelOf(model)).toBe('labelled');
    });
  });

  describe('GIVEN a package named __proto__ tagged constructor', () => {
    it('WHEN the state is built THEN its record keeps the name and tag', () => {
      const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [rootNode('__proto__', ['constructor'])] };

      const state = graphStateOf(model, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(state).toMatchObject({ packages: PROTO_NAMES });
    });
  });

  describe('GIVEN layout cache entries', () => {
    it.each(CACHE_CASES)(
      'WHEN the caches are $label THEN positions and folderPositions follow each entry on its own',
      ({ model, caches, positions, folderPositions }) => {
        const state = graphStateOf(model, caches, GRAPH_SHOWN_STUB);

        expect(state).toMatchObject({ positions, folderPositions });
      }
    );
  });
});
