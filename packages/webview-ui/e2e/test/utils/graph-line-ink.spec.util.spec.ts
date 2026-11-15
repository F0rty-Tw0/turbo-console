import { describe, expect, it } from 'vitest';

import { clipAround, inkTowardOf } from './graph-line-ink.spec.util.ts';
import type { Rgb } from '../../common/graph-title-chip.type.ts';

const FILL: Rgb = [31, 31, 31];

const EDGE: Rgb = [157, 157, 157];

/** A pixel 40 % of the way from the fill to the edge colour, as an anti-aliased thin line leaves it. */
const BLENDED: Rgb = [81, 81, 81];

describe('FEATURE: inkTowardOf', () => {
  it('GIVEN only box fill pixels WHEN measured THEN the ink is 0', () => {
    expect(inkTowardOf([FILL, FILL], FILL, EDGE)).toBe(0);
  });

  it('GIVEN one edge coloured pixel WHEN measured THEN the ink is 1', () => {
    expect(inkTowardOf([FILL, EDGE], FILL, EDGE)).toBe(1);
  });

  it('GIVEN a blended pixel among fill pixels WHEN measured THEN the ink is its share of the way', () => {
    expect(inkTowardOf([FILL, BLENDED, FILL], FILL, EDGE)).toBeCloseTo(50 / 126);
  });

  it('GIVEN a pixel darker than the fill, away from the edge colour WHEN measured THEN the ink stays 0', () => {
    expect(inkTowardOf([[0, 0, 0]], FILL, EDGE)).toBe(0);
  });
});

describe('FEATURE: clipAround', () => {
  it('GIVEN a point between pixels WHEN clipped by 2 THEN the clip is the 5 px square around its rounded pixel', () => {
    expect(clipAround({ x: 10.4, y: 20.6 }, 2)).toStrictEqual({ x: 8, y: 19, width: 5, height: 5 });
  });
});
