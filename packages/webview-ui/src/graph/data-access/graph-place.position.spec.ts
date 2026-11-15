import { describe, expect, it } from 'vitest';

import { positionOf } from './graph-place.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';

const A_AT: Position = { x: 10, y: 20 };

const B_AT: Position = { x: 30, y: 40 };

const C_AT: Position = { x: 50, y: 60 };

const D_AT: Position = { x: 70, y: 80 };

const ORIGIN: Position = { x: 0, y: 0 };

const PLACED: Positions = { a: A_AT, b: B_AT, c: C_AT, d: D_AT };

describe('FEATURE: positionOf', () => {
  describe('GIVEN positions without an own constructor key', () => {
    it('WHEN constructor is read THEN the origin returns, not an inherited member', () => {
      expect(positionOf(PLACED, 'constructor')).toStrictEqual(ORIGIN);
    });

    it('WHEN a placed name is read THEN its position returns', () => {
      expect(positionOf(PLACED, 'b')).toStrictEqual(B_AT);
    });

    it('WHEN a placed name is read THEN the position is a copy the canvas can move in place', () => {
      expect(positionOf(PLACED, 'b')).not.toBe(B_AT);
    });

    it('WHEN an unplaced name is read twice THEN each origin is its own object', () => {
      expect(positionOf(PLACED, 'missing')).not.toBe(positionOf(PLACED, 'missing'));
    });
  });
});
