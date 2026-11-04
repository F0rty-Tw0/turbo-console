import { describe, expect, it } from 'vitest';

import { dotOf, offsetOf, scaledOf, sumOf } from './vector.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

const FIRST: Position = { x: 3, y: -4 };

const SECOND: Position = { x: 5, y: 2 };

describe('FEATURE: vector maths', () => {
  describe('GIVEN the vectors (3, -4) and (5, 2)', () => {
    it('WHEN the offset of the first from the second is taken THEN it is (-2, -6)', () => {
      const offset = offsetOf(FIRST, SECOND);

      expect(offset).toStrictEqual({ x: -2, y: -6 });
    });

    it('WHEN they are summed THEN the sum is (8, -2)', () => {
      const sum = sumOf(FIRST, SECOND);

      expect(sum).toStrictEqual({ x: 8, y: -2 });
    });

    it('WHEN their dot product is taken THEN it is 7', () => {
      const dot = dotOf(FIRST, SECOND);

      expect(dot).toBe(7);
    });
  });

  it.each([
    [2, { x: 6, y: -8 }],
    [-1, { x: -3, y: 4 }],
    [0.5, { x: 1.5, y: -2 }]
  ])('GIVEN the vector (3, -4) WHEN it is scaled by %d THEN it is %j', (factor, expected) => {
    const scaled = scaledOf(FIRST, factor);

    expect(scaled).toStrictEqual(expected);
  });
});
