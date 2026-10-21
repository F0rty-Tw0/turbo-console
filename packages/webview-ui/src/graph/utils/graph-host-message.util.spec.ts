import { describe, expect, it } from 'vitest';

import { isGraphHostMessage } from './graph-host-message.util.ts';
import type { GraphEdge, Positions } from '../../bridge/common/graph-state.type.ts';

const EDGE: GraphEdge = { source: 'app', target: 'core' };

const EDGES = [EDGE];

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
      ['a graph with string positions', stateMessageOf({ ...GRAPH, positions: 'x' })]
    ])('WHEN it is %s THEN it is rejected', (_name, raw) => {
      const isMessage = isGraphHostMessage(raw);

      expect(isMessage).toBe(false);
    });
  });
});
