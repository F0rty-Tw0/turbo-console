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
import { rootNode } from '../test/utils/graph-model.spec.util.ts';

const EDGE_A: GraphEdge = { source: 'a', target: 'b' };
const EDGE_B: GraphEdge = { source: 'b', target: 'a' };
const CACHE: GraphLayoutCacheEntry = { hash: GRAPH_HASH_STUB, positions: POSITIONS_STUB };
const GHOST_POINT = { x: 1, y: 1 };
const GHOST_POSITIONS = { ...POSITIONS_STUB, ghost: GHOST_POINT };

describe('FEATURE: graph state builder', () => {
  describe('GIVEN a model with unsorted edges and one pair listed twice', () => {
    it('WHEN the state is built THEN packages and edges are sorted, deduped and carry no kind', () => {
      const state = graphStateOf(GRAPH_MODEL_STUB, null);

      expect(state).toStrictEqual(GRAPH_STATE_STUB);
    });
  });

  describe('GIVEN a monorepo model that lists the root // package', () => {
    it('WHEN the state is built THEN // is a package like any other', () => {
      const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [...GRAPH_MODEL_STUB.packages, rootNode('//')] };

      const state = graphStateOf(model, null);

      expect(state).toMatchObject({ kind: 'graph', packages: ['//', '@org/x', 'a', 'web'] });
    });
  });

  describe('GIVEN a single-package model', () => {
    it('WHEN the state is built THEN it is singlePackage', () => {
      const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true };

      expect(graphStateOf(model, null)).toStrictEqual({ kind: 'singlePackage' });
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
  it.each([
    [[], [], '878f5675'],
    [['a', 'b'], [{ source: 'a', target: 'b' }], 'e7a8462b'],
    [['é'], [], 'cd4b4901'],
    [['p3'], [], '0fcb6dd0']
  ])('GIVEN packages %j and edges %j WHEN hashed THEN it is %s (FNV-1a over UTF-8)', (packages, edges, expected) => {
    expect(graphHashOf(packages, edges)).toBe(expected);
  });

  it('WHEN the same graph is listed in another order THEN the hash is the same', () => {
    const shuffled = graphHashOf(['b', 'a'], [EDGE_B, EDGE_A]);

    expect(shuffled).toBe(graphHashOf(['a', 'b'], [EDGE_A, EDGE_B]));
  });

  it('WHEN an edge is added THEN the hash changes', () => {
    expect(graphHashOf(['a', 'b'], [EDGE_A])).not.toBe(graphHashOf(['a', 'b'], [EDGE_A, EDGE_B]));
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
