import { describe, expect, it } from 'vitest';

import { flowPhaseOf, flowSegmentsOf } from './flow-geometry.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { FlowEdgeGeometry, FlowSegment } from '../common/flow.type.ts';

const pointOf = (x: number, y: number): Position => {
  const point: Position = { x, y };

  return point;
};

const edgeOf = (source: Position, target: Position, controlPoints: Position[] = []): FlowEdgeGeometry => {
  const edge: FlowEdgeGeometry = { source, target, controlPoints };

  return edge;
};

const segmentOf = (from: Position, to: Position, control: Position | null = null): FlowSegment => {
  const segment: FlowSegment = { from, control, to };

  return segment;
};

const ORIGIN = pointOf(0, 0);

describe('FEATURE: flowSegmentsOf', () => {
  describe('GIVEN the edge (1,2) to (3,4) drawn at zoom 2, pan (5,7)', () => {
    it('WHEN it has no control points THEN it is one straight segment', () => {
      const edge = edgeOf(pointOf(1, 2), pointOf(3, 4));

      const segments = flowSegmentsOf([edge], pointOf(5, 7), 2);

      expect(segments).toStrictEqual([segmentOf(pointOf(7, 11), pointOf(11, 15))]);
    });

    it('WHEN it has one control point (2,1) THEN it is one quadratic segment through the rendered control (9,9)', () => {
      const edge = edgeOf(pointOf(1, 2), pointOf(3, 4), [pointOf(2, 1)]);

      const segments = flowSegmentsOf([edge], pointOf(5, 7), 2);

      expect(segments).toStrictEqual([segmentOf(pointOf(7, 11), pointOf(11, 15), pointOf(9, 9))]);
    });
  });

  describe('GIVEN the edge (0,0) to (30,0) at zoom 1, pan 0', () => {
    it('WHEN it has two control points (10,5) and (20,5) THEN it is three straight segments through the points', () => {
      const edge = edgeOf(ORIGIN, pointOf(30, 0), [pointOf(10, 5), pointOf(20, 5)]);

      const segments = flowSegmentsOf([edge], ORIGIN, 1);

      expect(segments).toStrictEqual([
        segmentOf(ORIGIN, pointOf(10, 5)),
        segmentOf(pointOf(10, 5), pointOf(20, 5)),
        segmentOf(pointOf(20, 5), pointOf(30, 0))
      ]);
    });
  });

  describe('GIVEN an edge not yet placed', () => {
    it.each([
      { title: 'source x is NaN', edge: edgeOf(pointOf(Number.NaN, 0), pointOf(3, 4)) },
      { title: 'target y is Infinity', edge: edgeOf(ORIGIN, pointOf(3, Number.POSITIVE_INFINITY)) },
      { title: 'a control point is NaN', edge: edgeOf(ORIGIN, pointOf(3, 4), [pointOf(Number.NaN, 1)]) },
      {
        title: 'the second of two control points is NaN',
        edge: edgeOf(ORIGIN, pointOf(3, 4), [pointOf(1, 1), pointOf(2, Number.NaN)])
      }
    ])('WHEN its $title THEN it yields no segment', ({ edge }) => {
      const segments = flowSegmentsOf([edge], ORIGIN, 1);

      expect(segments).toStrictEqual([]);
    });
  });

  describe('GIVEN two edges and one not yet placed between them', () => {
    it('WHEN the segments are mapped THEN the placed edges keep their order and the unplaced one is skipped', () => {
      const first = edgeOf(ORIGIN, pointOf(1, 1));
      const unplaced = edgeOf(pointOf(Number.NaN, 0), pointOf(2, 2));
      const last = edgeOf(pointOf(5, 5), pointOf(6, 6));

      const segments = flowSegmentsOf([first, unplaced, last], ORIGIN, 1);

      expect(segments).toStrictEqual([segmentOf(ORIGIN, pointOf(1, 1)), segmentOf(pointOf(5, 5), pointOf(6, 6))]);
    });
  });

  describe('GIVEN no edges', () => {
    it('WHEN the segments are mapped THEN there are none', () => {
      const segments = flowSegmentsOf([], ORIGIN, 1);

      expect(segments).toStrictEqual([]);
    });
  });
});

describe('FEATURE: flowPhaseOf', () => {
  describe('GIVEN a 160 ms cycle over a 12 px period', () => {
    it.each([
      { nowMs: 0, expected: 0 },
      { nowMs: 80, expected: 6 },
      { nowMs: 160, expected: 0 },
      { nowMs: 200, expected: 3 }
    ])('WHEN the clock is at $nowMs ms THEN the phase is $expected px', ({ nowMs, expected }) => {
      const phase = flowPhaseOf(nowMs, 160, 12);

      expect(phase).toBe(expected);
    });
  });
});
