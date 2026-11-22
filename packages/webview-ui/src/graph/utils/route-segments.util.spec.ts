import { describe, expect, it } from 'vitest';

import { routeSegmentsOf } from './route-segments.util.ts';
import type { EdgeRoute, Position } from '../../bridge/common/graph-state.type.ts';
import type { RouteSegments } from '../common/route-segments.type.ts';

const ORIGIN: Position = { x: 0, y: 0 };
const BELOW_100: Position = { x: 0, y: 100 };
const BELOW_200: Position = { x: 0, y: 200 };
const RIGHT_100: Position = { x: 100, y: 0 };
const START_16: Position = { x: 0, y: 16 };
const END_84: Position = { x: 0, y: 84 };
const END_184: Position = { x: 0, y: 184 };
const DOWN_BENDS: Position[] = [
  { x: 40, y: 50 },
  { x: 40, y: 150 },
  { x: 10, y: 190 }
];
const DOWN_ROUTE: EdgeRoute = { start: START_16, bends: DOWN_BENDS, end: END_184 };
const UP_START: Position = { x: 0, y: 84 };
const UP_BEND: Position = { x: 20, y: 75 };
const UP_ROUTE: EdgeRoute = { start: UP_START, bends: [UP_BEND], end: START_16 };
const SIDE_START: Position = { x: 50, y: 0 };
const SIDE_BEND: Position = { x: 50, y: -30 };
const SIDE_END: Position = { x: 50, y: 0 };
const SIDE_ROUTE: EdgeRoute = { start: SIDE_START, bends: [SIDE_BEND], end: SIDE_END };
const TWIN_BEND: Position = { x: 40, y: 50 };
const TWIN_ROUTE: EdgeRoute = { start: START_16, bends: [TWIN_BEND, TWIN_BEND], end: END_184 };
const STRAIGHT_ROUTE: EdgeRoute = { start: START_16, bends: [], end: END_84 };
const SAME_CENTRE: Position = { x: 5, y: 5 };
const CROSS_SOURCE: Position = { x: 13, y: 7 };
const CROSS_TARGET: Position = { x: -41, y: 260 };
const CROSS_START: Position = { x: 13, y: 23 };
const CROSS_END: Position = { x: -41, y: 244 };
const CROSS_BENDS: Position[] = [
  { x: 61.5, y: 40.25 },
  { x: -83, y: 118 },
  { x: 4.75, y: 201.5 },
  { x: -29, y: 255.125 }
];
const CROSS_ROUTE: EdgeRoute = { start: CROSS_START, bends: CROSS_BENDS, end: CROSS_END };

/** To 9 decimals, and −0 as 0, so float noise and the sign of a zero never fail an exact match. */
const roundOf = (value: number): number => Math.round(value * 1e9) / 1e9 + 0;

const roundedOf = (segments: RouteSegments | null): RouteSegments | null => {
  if (segments === null) return null;

  const segWeights = segments.segWeights.map(roundOf);
  const segDistances = segments.segDistances.map(roundOf);
  const rounded: RouteSegments = { ...segments, segWeights, segDistances };

  return rounded;
};

const roundedPointOf = (point: Position): Position => {
  const rounded: Position = { x: roundOf(point.x), y: roundOf(point.y) };

  return rounded;
};

const segmentsOf = (segWeights: number[], segDistances: number[], srcEnd: string, tgtEnd: string): RouteSegments => {
  const segments: RouteSegments = { segWeights, segDistances, srcEnd, tgtEnd };

  return segments;
};

/**
 * Cytoscape's own forward maths for a `node-position` segment point (cytoscape.cjs.js `findSegmentsPoints`, about line
 * 23782): `P = S + w·(T−S) + d·n` with `n = (−dy, dx) / L`. Written here, not imported, so the util is checked against
 * the renderer's formula rather than against itself.
 */
const forwardPointOf = (source: Position, target: Position, weight: number, distance: number): Position => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  const x = source.x + weight * dx + (distance * -dy) / length;
  const y = source.y + weight * dy + (distance * dx) / length;
  const point: Position = { x, y };

  return point;
};

const rebuiltBendsOf = (source: Position, target: Position, segments: RouteSegments | null): Position[] => {
  if (segments === null) return [];

  const { segWeights, segDistances } = segments;
  const rebuildAt = (weight: number, index: number): Position => forwardPointOf(source, target, weight, segDistances[index] ?? NaN);
  const bends = segWeights.map(rebuildAt);
  const rounded = bends.map(roundedPointOf);

  return rounded;
};

describe('FEATURE: routeSegmentsOf', () => {
  describe('GIVEN a source above its target', () => {
    it('WHEN a 3-bend route runs down on the left THEN each bend gets its share of the way and a negative distance', () => {
      const expected = segmentsOf([0.25, 0.75, 0.95], [-40, -40, -10], '0px 16px', '0px -16px');

      const segments = routeSegmentsOf(DOWN_ROUTE, ORIGIN, BELOW_200);
      const rounded = roundedOf(segments);

      expect(rounded).toStrictEqual(expected);
    });

    it('WHEN two bends sit on one point THEN both keep the same weight and distance', () => {
      const expected = segmentsOf([0.25, 0.25], [-40, -40], '0px 16px', '0px -16px');

      const segments = routeSegmentsOf(TWIN_ROUTE, ORIGIN, BELOW_200);
      const rounded = roundedOf(segments);

      expect(rounded).toStrictEqual(expected);
    });

    it('WHEN the route has no bends THEN one bend sits at the middle of its ends, measured from each end node', () => {
      const expected = segmentsOf([0.5], [0], '0px 16px', '0px -16px');

      const segments = routeSegmentsOf(STRAIGHT_ROUTE, ORIGIN, BELOW_100);
      const rounded = roundedOf(segments);

      expect(rounded).toStrictEqual(expected);
    });
  });

  describe('GIVEN a source below its target', () => {
    it('WHEN a 1-bend route runs up on the right THEN the bend is a quarter of the way at a positive distance', () => {
      const expected = segmentsOf([0.25], [20], '0px -16px', '0px 16px');

      const segments = routeSegmentsOf(UP_ROUTE, BELOW_100, ORIGIN);
      const rounded = roundedOf(segments);

      expect(rounded).toStrictEqual(expected);
    });
  });

  describe('GIVEN a source left of its target', () => {
    it('WHEN a 1-bend route rises above them THEN the bend is halfway at a negative distance', () => {
      const expected = segmentsOf([0.5], [-30], '50px 0px', '-50px 0px');

      const segments = routeSegmentsOf(SIDE_ROUTE, ORIGIN, RIGHT_100);
      const rounded = roundedOf(segments);

      expect(rounded).toStrictEqual(expected);
    });
  });

  describe('GIVEN a source and target on one centre', () => {
    it('WHEN segments are asked for THEN there are none', () => {
      const segments = routeSegmentsOf(DOWN_ROUTE, SAME_CENTRE, SAME_CENTRE);

      expect(segments).toBeNull();
    });
  });

  describe('GIVEN a slanted pair of centres', () => {
    it("WHEN a 4-bend route is turned into segments THEN Cytoscape's forward formula rebuilds every bend", () => {
      const segments = routeSegmentsOf(CROSS_ROUTE, CROSS_SOURCE, CROSS_TARGET);
      const rebuilt = rebuiltBendsOf(CROSS_SOURCE, CROSS_TARGET, segments);

      expect(rebuilt).toStrictEqual(CROSS_BENDS);
    });
  });
});
