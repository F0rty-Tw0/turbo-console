import { describe, expect, it } from 'vitest';

import { drawnBendsOf } from './drawn-bends.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { DrawnBendsSource } from '../common/flow.type.ts';

const CURVE_BENDS: Position[] = [{ x: 8, y: 9 }];

const edgeOf = (curve: Position[] | undefined): DrawnBendsSource => {
  const edge: DrawnBendsSource = { controlPoints: (): Position[] | undefined => curve };

  return edge;
};

describe('FEATURE: drawnBendsOf', () => {
  it.each([
    { title: 'a curved edge', edge: edgeOf(CURVE_BENDS), expected: CURVE_BENDS },
    { title: 'a straight edge', edge: edgeOf(undefined), expected: [] }
  ])('GIVEN $title WHEN its bends are read THEN they are $expected', ({ edge, expected }) => {
    const bends = drawnBendsOf(edge);

    expect(bends).toStrictEqual(expected);
  });
});
