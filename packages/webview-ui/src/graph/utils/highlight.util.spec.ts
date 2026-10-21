import { describe, expect, it } from 'vitest';

import { edgeStateOf, nodeStateOf } from './highlight.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { Closure } from '../common/closure.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';

const CORE = new Set(['core']);

const APP = new Set(['app']);

const CLOSURE: Closure = { dependencies: CORE, dependents: APP };

const APP_TO_CORE: GraphEdge = { source: 'app', target: 'core' };

const NODE_CASES: [string, ProbeState][] = [
  ['lib-a', 'selected'],
  ['core', 'highlighted'],
  ['app', 'highlighted'],
  ['lib-b', 'dimmed']
];

const EDGE_CASES: [GraphEdge, ProbeState][] = [
  [{ source: 'app', target: 'lib-a' }, 'highlighted'],
  [{ source: 'lib-a', target: 'core' }, 'highlighted'],
  [{ source: 'app', target: 'lib-b' }, 'dimmed'],
  [{ source: 'lib-b', target: 'core' }, 'dimmed']
];

describe('FEATURE: nodeStateOf and edgeStateOf', () => {
  describe('GIVEN lib-a selected in the diamond', () => {
    it.each(NODE_CASES)('WHEN the node is %s THEN its state is %s', (name, state) => {
      expect(nodeStateOf(name, 'lib-a', CLOSURE)).toBe(state);
    });

    it.each(EDGE_CASES)('WHEN the edge is %j THEN its state is %s', (edge, state) => {
      expect(edgeStateOf(edge, 'lib-a', CLOSURE)).toBe(state);
    });
  });

  it('GIVEN no selection WHEN a node or an edge is read THEN it is normal', () => {
    expect(nodeStateOf('app', null, null)).toBe('normal');
    expect(edgeStateOf(APP_TO_CORE, null, null)).toBe('normal');
  });
});
