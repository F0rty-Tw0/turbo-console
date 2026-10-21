import { describe, expect, it } from 'vitest';

import { isGraphHostMessage } from './graph-host-message.util.ts';
import type { GraphEdge, Positions } from '../../bridge/common/graph-state.type.ts';

const EDGE: GraphEdge = { source: 'app', target: 'core' };

const EDGES = [EDGE];

const NO_TARGET_EDGE = { source: 'app' };

const NUMERIC_SOURCE_EDGE = { source: 1, target: 'core' };

const ORIGIN = { x: 0, y: 0 };

const POSITIONS: Positions = { app: ORIGIN, core: ORIGIN };

const GRAPH = { kind: 'graph', hash: 'h', packages: ['app', 'core'], edges: EDGES, positions: null };

const CACHED_GRAPH = { ...GRAPH, positions: POSITIONS };

const LOADING = { kind: 'loading' };

const ERROR = { kind: 'error', message: 'x' };

const SINGLE_PACKAGE = { kind: 'singlePackage' };

const stateMessageOf = (state: unknown): unknown => {
  const message = { type: 'state', state };

  return message;
};

describe('FEATURE: isGraphHostMessage', () => {
  describe('GIVEN a state message', () => {
    it.each([
      ['loading', LOADING],
      ['error', ERROR],
      ['singlePackage', SINGLE_PACKAGE],
      ['graph with no positions', GRAPH],
      ['graph with cached positions', CACHED_GRAPH]
    ])('WHEN its state is %s THEN it is accepted', (_name, state) => {
      const isMessage = isGraphHostMessage(stateMessageOf(state));

      expect(isMessage).toBe(true);
    });
  });

  describe('GIVEN anything else', () => {
    it.each([
      ['null', null],
      ['a string', 'state'],
      ['an empty object', {}],
      ['an unknown type', { type: 'nope' }],
      ['a state message with no state', { type: 'state' }],
      ['a string state', stateMessageOf('x')],
      ['an unknown state kind', stateMessageOf({ kind: 'other' })],
      ['an error with no message', stateMessageOf({ kind: 'error' })],
      ['a graph with a numeric hash', stateMessageOf({ ...GRAPH, hash: 5 })],
      ['a graph with string packages', stateMessageOf({ ...GRAPH, packages: 'x' })],
      ['a graph with null edges', stateMessageOf({ ...GRAPH, edges: null })],
      ['a graph with a numeric package name', stateMessageOf({ ...GRAPH, packages: ['app', 5] })],
      ['a graph with a null package name', stateMessageOf({ ...GRAPH, packages: [null] })],
      ['a graph with a null edge', stateMessageOf({ ...GRAPH, edges: [null] })],
      ['a graph with a string edge', stateMessageOf({ ...GRAPH, edges: ['app>core'] })],
      ['a graph with an edge with no target', stateMessageOf({ ...GRAPH, edges: [NO_TARGET_EDGE] })],
      ['a graph with an edge with a numeric source', stateMessageOf({ ...GRAPH, edges: [NUMERIC_SOURCE_EDGE] })],
      ['a graph with string positions', stateMessageOf({ ...GRAPH, positions: 'x' })]
    ])('WHEN it is %s THEN it is rejected', (_name, raw) => {
      const isMessage = isGraphHostMessage(raw);

      expect(isMessage).toBe(false);
    });
  });
});
