import { describe, expect, it } from 'vitest';

import { edgeIdOf } from './edge-id.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

const A_B: GraphEdge = { source: 'a', target: 'b' };

const AB_C: GraphEdge = { source: 'a>b', target: 'c' };

const A_BC: GraphEdge = { source: 'a', target: 'b>c' };

const QUOTED: GraphEdge = { source: 'a","b', target: 'c' };

const SPLIT_QUOTE: GraphEdge = { source: 'a', target: 'b","c' };

describe('FEATURE: edgeIdOf', () => {
  describe('GIVEN an edge a > b', () => {
    it('WHEN its id is made THEN it is a NUL, then the JSON pair', () => {
      const id = edgeIdOf(A_B);

      expect(id).toBe('\u0000["a","b"]');
    });

    it('WHEN its id is made THEN it is no package name a, b or a>b', () => {
      const id = edgeIdOf(A_B);

      expect(['a', 'b', 'a>b']).not.toContain(id);
    });
  });

  it.each([
    { pair: 'a>b > c and a > b>c', first: AB_C, second: A_BC },
    { pair: 'names that hold JSON quotes', first: QUOTED, second: SPLIT_QUOTE }
  ])('GIVEN the edges $pair WHEN their ids are made THEN they differ', ({ first, second }) => {
    const firstId = edgeIdOf(first);
    const secondId = edgeIdOf(second);

    expect(firstId).not.toBe(secondId);
  });
});
