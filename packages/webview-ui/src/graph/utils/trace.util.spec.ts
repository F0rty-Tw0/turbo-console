import { describe, expect, it } from 'vitest';

import { traceOf } from './trace.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

const edgesOf = (list: string): GraphEdge[] => {
  const pairs = list.split(', ');

  return pairs.map((pair) => {
    const [source = '', target = ''] = pair.split('>');
    const edge: GraphEdge = { source, target };

    return edge;
  });
};

const pairsOf = (path: string[]): GraphEdge[] => {
  const links = path.slice(1);

  return links.map((target, index) => {
    const edge: GraphEdge = { source: path[index] ?? '', target };

    return edge;
  });
};

const CHAIN = edgesOf('a>b, b>c, c>d');
const DIAMOND = edgesOf('app>lib-a, app>lib-b, lib-a>core, lib-b>core');
const DIAMOND_REVERSED = edgesOf('lib-b>core, lib-a>core, app>lib-b, app>lib-a');
const SHORTCUT = edgesOf('a>b, b>c, a>c');
const BOTH = edgesOf('a>b, b>a');
const SPLIT = edgesOf('x>y, p>q');
const CYCLE = edgesOf('a>b, b>c, c>a, c>d');
const PROTO = edgesOf('__proto__>constructor, constructor>plain');
const DUPLICATE = edgesOf('a>b, a>b');
const UPPER = edgesOf('s>a, s>B, a>t, B>t');

describe('FEATURE: traceOf', () => {
  describe('GIVEN these graphs', () => {
    it.each([
      { title: 'direct link', edges: CHAIN, start: 'a', end: 'b', direction: 'forward', path: ['a', 'b'] },
      { title: '3-step chain', edges: CHAIN, start: 'a', end: 'd', direction: 'forward', path: ['a', 'b', 'c', 'd'] },
      { title: 'starts mid-chain', edges: CHAIN, start: 'b', end: 'd', direction: 'forward', path: ['b', 'c', 'd'] },
      { title: 'backward', edges: CHAIN, start: 'd', end: 'a', direction: 'backward', path: ['a', 'b', 'c', 'd'] },
      { title: 'backward, direct', edges: CHAIN, start: 'b', end: 'a', direction: 'backward', path: ['a', 'b'] },
      {
        title: 'equal paths, name order',
        edges: DIAMOND,
        start: 'app',
        end: 'core',
        direction: 'forward',
        path: ['app', 'lib-a', 'core']
      },
      {
        title: 'equal paths, edges listed in reverse',
        edges: DIAMOND_REVERSED,
        start: 'app',
        end: 'core',
        direction: 'forward',
        path: ['app', 'lib-a', 'core']
      },
      {
        title: 'equal paths, backward',
        edges: DIAMOND,
        start: 'core',
        end: 'app',
        direction: 'backward',
        path: ['app', 'lib-a', 'core']
      },
      { title: 'shortest wins', edges: SHORTCUT, start: 'a', end: 'c', direction: 'forward', path: ['a', 'c'] },
      { title: 'forward wins over backward', edges: BOTH, start: 'a', end: 'b', direction: 'forward', path: ['a', 'b'] },
      { title: 'no path between components', edges: SPLIT, start: 'x', end: 'p', direction: 'none', path: [] },
      { title: 'unknown end', edges: CHAIN, start: 'a', end: 'ghost', direction: 'none', path: [] },
      { title: 'unknown start', edges: CHAIN, start: 'ghost', end: 'a', direction: 'none', path: [] },
      { title: 'start has no edges', edges: CHAIN, start: 'lonely', end: 'a', direction: 'none', path: [] },
      { title: 'cycle, forward', edges: CYCLE, start: 'a', end: 'd', direction: 'forward', path: ['a', 'b', 'c', 'd'] },
      { title: 'cycle, backward', edges: CYCLE, start: 'd', end: 'a', direction: 'backward', path: ['a', 'b', 'c', 'd'] },
      { title: 'cycle, no path (ends)', edges: CYCLE, start: 'a', end: 'ghost', direction: 'none', path: [] },
      { title: 'start equals end', edges: CHAIN, start: 'b', end: 'b', direction: 'forward', path: ['b'] },
      {
        title: '__proto__ forward',
        edges: PROTO,
        start: '__proto__',
        end: 'plain',
        direction: 'forward',
        path: ['__proto__', 'constructor', 'plain']
      },
      {
        title: '__proto__ backward',
        edges: PROTO,
        start: 'plain',
        end: '__proto__',
        direction: 'backward',
        path: ['__proto__', 'constructor', 'plain']
      },
      { title: 'duplicate edges', edges: DUPLICATE, start: 'a', end: 'b', direction: 'forward', path: ['a', 'b'] },
      { title: 'code-unit order (B before a)', edges: UPPER, start: 's', end: 't', direction: 'forward', path: ['s', 'B', 't'] }
    ])('WHEN $title THEN direction, path and edges are exact', (row) => {
      const result = traceOf(row.edges, row.start, row.end);

      expect(result.direction).toStrictEqual(row.direction);
      expect(result.path).toStrictEqual(row.path);
      expect(result.edges).toStrictEqual(pairsOf(row.path));
    });
  });

  describe('GIVEN a chain', () => {
    it('WHEN a to b is traced THEN the path edge is the input edge object', () => {
      const result = traceOf(CHAIN, 'a', 'b');

      expect(result.edges[0]).toBe(CHAIN[0]);
    });
  });
});
