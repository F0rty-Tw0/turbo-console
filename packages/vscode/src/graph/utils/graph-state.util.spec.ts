import { TurboException } from '@turbo-console/core';
import type { WorkspaceModel } from '@turbo-console/core';
import type { GraphEdge, GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphHashOf, graphStateOf, graphStateOfRoot } from './graph-state.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import { loadFailureOf } from '../../roots/test/utils/load-failure.spec.util.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphLayoutCacheEntry } from '../common/graph-cache.type.ts';
import { GRAPH_HASH_STUB, GRAPH_MODEL_STUB, GRAPH_STATE_STUB, POSITIONS_STUB } from '../test/stubs/graph-model.stub.ts';
import { graphPackageOf, rootNode } from '../test/utils/graph-model.spec.util.ts';

const ROOT_FIRST_NAMES = [{ name: '//' }, { name: '@org/x' }, { name: 'a' }, { name: 'web' }];
const PROTO_NAMES = [{ name: '__proto__', tags: ['constructor'] }];
const EDGE_A: GraphEdge = { source: 'a', target: 'b' };
const EDGE_B: GraphEdge = { source: 'b', target: 'a' };
const ARROW_NAMED: GraphEdge = { source: 'a>b', target: 'c' };
const ARROW_SPLIT: GraphEdge = { source: 'a', target: 'b>c' };
const GRAPH_INFOS = [
  graphPackageOf('@org/x', 'packages/libs/x', [], 1),
  graphPackageOf('a', 'packages/a', [], 1),
  graphPackageOf('web', 'apps/web', ['app', 'ui'], 2)
];
const CACHE: GraphLayoutCacheEntry = { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB };
const GHOST_POINT = { x: 1, y: 1 };
const GHOST_POSITIONS = { ...POSITIONS_STUB, ghost: GHOST_POINT };

describe('FEATURE: graph state builder', () => {
  describe('GIVEN a model with unsorted edges and one pair listed twice', () => {
    it('WHEN the state is built THEN each package carries its path and its tags sorted and deduplicated, and edges are sorted, deduped and carry no kind', () => {
      const state = graphStateOf(GRAPH_MODEL_STUB, null);

      expect(state).toStrictEqual(GRAPH_STATE_STUB);
    });
  });

  describe('GIVEN a package with two visible tasks and an atom-file one', () => {
    it('WHEN the state is built THEN taskCount counts the visible tasks only', () => {
      const state = graphStateOf(GRAPH_MODEL_STUB, null);

      expect(state).toMatchObject({ kind: 'graph', packages: GRAPH_INFOS });
    });
  });

  describe('GIVEN a monorepo model that lists the root // package', () => {
    it('WHEN the state is built THEN // is a package like any other', () => {
      const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [...GRAPH_MODEL_STUB.packages, rootNode('//')] };

      const state = graphStateOf(model, null);

      expect(state).toMatchObject({ kind: 'graph', packages: ROOT_FIRST_NAMES });
    });
  });

  describe('GIVEN a single-package model', () => {
    it('WHEN the state is built THEN it is singlePackage', () => {
      const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true };

      expect(graphStateOf(model, null)).toStrictEqual({ kind: 'singlePackage' });
    });
  });

  describe('GIVEN a package named __proto__ tagged constructor', () => {
    it('WHEN the state is built THEN its record keeps the name and tag', () => {
      const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [rootNode('__proto__', ['constructor'])] };

      const state = graphStateOf(model, null);

      expect(state).toMatchObject({ packages: PROTO_NAMES });
    });
  });

  describe('GIVEN a layout cache entry', () => {
    it('WHEN its hash is the graph hash THEN positions are the cached ones', () => {
      expect(graphStateOf(GRAPH_MODEL_STUB, CACHE)).toMatchObject({ positions: POSITIONS_STUB });
    });

    it('WHEN a package was added since the entry was stored THEN positions are null', () => {
      const grown: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [...GRAPH_MODEL_STUB.packages, rootNode('new')] };

      expect(graphStateOf(grown, CACHE)).toMatchObject({ positions: null });
    });

    it('WHEN its hash is the graph hash but its key set is not the packages THEN positions are null', () => {
      const entry: GraphLayoutCacheEntry = { hash: GRAPH_HASH_STUB, positions: GHOST_POSITIONS };

      expect(graphStateOf(GRAPH_MODEL_STUB, entry)).toMatchObject({ positions: null });
    });
  });
});

describe('FEATURE: graph hash', () => {
  it('GIVEN packages whose task counts differ WHEN hashed THEN the hash is the same', () => {
    const few = graphHashOf([graphPackageOf('a', 'x', [], 1)], []);
    const many = graphHashOf([graphPackageOf('a', 'x', [], 40)], []);

    expect(few).toBe(many);
  });

  it.each([
    [[], [], '878f5675'],
    [[graphPackageOf('a', 'packages/a'), graphPackageOf('b', 'packages/b')], [{ source: 'a', target: 'b' }], '4abfc33a'],
    [[graphPackageOf('é', '')], [], '3af7d88d'],
    [[graphPackageOf('p3', 'packages/p3', ['t'])], [], '9a1d7495'],
    [[graphPackageOf('a', 'x'), graphPackageOf('b', 'y', ['t'])], [], '6d3562a7'],
    [[graphPackageOf('__proto__', '', ['constructor'])], [], '64b21699']
  ])('GIVEN packages %j and edges %j WHEN hashed THEN it is %s (FNV-1a over UTF-8)', (packages, edges, expected) => {
    expect(graphHashOf(packages, edges)).toBe(expected);
  });

  it('WHEN the same graph is listed in another order THEN the hash is the same', () => {
    const shuffled = graphHashOf([graphPackageOf('b', 'y'), graphPackageOf('a', 'x')], [EDGE_B, EDGE_A]);

    expect(shuffled).toBe(graphHashOf([graphPackageOf('a', 'x'), graphPackageOf('b', 'y')], [EDGE_A, EDGE_B]));
  });

  it('WHEN an edge is added THEN the hash changes', () => {
    const packages = [graphPackageOf('a', 'x'), graphPackageOf('b', 'y')];

    expect(graphHashOf(packages, [EDGE_A])).not.toBe(graphHashOf(packages, [EDGE_A, EDGE_B]));
  });

  it('WHEN a path changes THEN the hash changes', () => {
    const base = graphHashOf([graphPackageOf('a', 'x'), graphPackageOf('b', 'y', ['t'])], []);

    const changed = graphHashOf([graphPackageOf('a', 'x2'), graphPackageOf('b', 'y', ['t'])], []);

    expect(changed).not.toBe(base);
  });

  it('WHEN a tag changes THEN the hash changes', () => {
    const base = graphHashOf([graphPackageOf('a', 'x'), graphPackageOf('b', 'y', ['t'])], []);

    const changed = graphHashOf([graphPackageOf('a', 'x'), graphPackageOf('b', 'y', ['u'])], []);

    expect(changed).not.toBe(base);
  });

  it('GIVEN edges whose names contain > WHEN hashed THEN the two ways to split a>b>c differ', () => {
    const names = ['a', 'a>b', 'b', 'b>c', 'c'];
    const packages = names.map((name) => graphPackageOf(name, ''));

    const named = graphHashOf(packages, [ARROW_NAMED]);
    const split = graphHashOf(packages, [ARROW_SPLIT]);

    expect(named).not.toBe(split);
  });
});

const stateOf = (fields: Partial<RootState>): RootState => {
  const state: RootState = { ...ROOT_STATE_STUB, ...fields };

  return state;
};
const LOAD_FAILURE = loadFailureOf('load', new TurboException('failed', 'bad json'));
const LOADING: GraphState = { kind: 'loading' };

describe('FEATURE: graph state of a root', () => {
  it('GIVEN no state WHEN built THEN it is loading', () => {
    expect(graphStateOfRoot(undefined, null)).toStrictEqual(LOADING);
  });

  it('GIVEN no model and no error WHEN built THEN it is loading', () => {
    expect(graphStateOfRoot(stateOf({ model: null }), null)).toStrictEqual(LOADING);
  });

  it('GIVEN no model and a binary failure WHEN built THEN it is the binary text', () => {
    const state = graphStateOfRoot(stateOf({ model: null, error: LOAD_FAILURE_STUB }), null);

    expect(state).toStrictEqual({ kind: 'error', message: MESSAGE_TEXTS['binary-not-found'] });
  });

  it('GIVEN no model and a load failure WHEN built THEN it is the load text', () => {
    const state = graphStateOfRoot(stateOf({ model: null, error: LOAD_FAILURE }), null);

    expect(state).toStrictEqual({ kind: 'error', message: MESSAGE_TEXTS['load-no-model'] });
  });

  it('GIVEN a model kept after a load failure WHEN built THEN it is that model graph', () => {
    const state = graphStateOfRoot(stateOf({ model: GRAPH_MODEL_STUB, error: LOAD_FAILURE }), null);

    expect(state).toStrictEqual(GRAPH_STATE_STUB);
  });

  it('GIVEN a model with a binary failure WHEN built THEN it is the binary error', () => {
    const state = graphStateOfRoot(stateOf({ model: GRAPH_MODEL_STUB, error: LOAD_FAILURE_STUB }), null);

    expect(state).toStrictEqual({ kind: 'error', message: MESSAGE_TEXTS['binary-not-found'] });
  });
});
