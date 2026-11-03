import { describe, expect, it, vi } from 'vitest';

import { drawnBendsOf } from './drawn-bends.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { DrawnBendsSource } from '../common/flow.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';

const SEGMENT_BENDS: Position[] = [{ x: 4, y: 5 }];
const CURVE_BENDS: Position[] = [{ x: 8, y: 9 }];

const edgeOf = (isRouted: boolean, segments: Position[] | undefined, curve: Position[] | undefined): DrawnBendsSource => {
  const edge: DrawnBendsSource = {
    hasClass: (name: string): boolean => isRouted && name === ROUTED_CLASS,
    segmentPoints: vi.fn((): Position[] | undefined => segments),
    controlPoints: vi.fn((): Position[] | undefined => curve)
  };

  return edge;
};

describe('FEATURE: drawnBendsOf', () => {
  it.each([
    { title: 'a routed edge', edge: edgeOf(true, SEGMENT_BENDS, CURVE_BENDS), expected: SEGMENT_BENDS },
    { title: 'an unrouted edge', edge: edgeOf(false, SEGMENT_BENDS, CURVE_BENDS), expected: CURVE_BENDS },
    { title: 'a routed edge Cytoscape does not draw as segments', edge: edgeOf(true, undefined, CURVE_BENDS), expected: [] },
    { title: 'a straight edge', edge: edgeOf(false, undefined, undefined), expected: [] }
  ])('GIVEN $title WHEN its bends are read THEN they are $expected', ({ edge, expected }) => {
    const bends = drawnBendsOf(edge);

    expect(bends).toStrictEqual(expected);
  });

  it('GIVEN a routed edge WHEN its bends are read THEN the control points are not asked for', () => {
    const edge = edgeOf(true, SEGMENT_BENDS, CURVE_BENDS);

    drawnBendsOf(edge);

    expect(edge.controlPoints).not.toHaveBeenCalled();
  });

  it('GIVEN an unrouted edge WHEN its bends are read THEN the segment points are not asked for', () => {
    const edge = edgeOf(false, SEGMENT_BENDS, CURVE_BENDS);

    drawnBendsOf(edge);

    expect(edge.segmentPoints).not.toHaveBeenCalled();
  });
});
