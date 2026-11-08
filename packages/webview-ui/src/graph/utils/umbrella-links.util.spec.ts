import { describe, expect, it } from 'vitest';

import { edgeIdOf } from './edge-id.util.ts';
import { openUmbrellaRouteOf, umbrellaLinkSegmentsOf } from './umbrella-links.util.ts';
import type { EdgeRoute, GraphEdge, Position, Positions, Routes } from '../../bridge/common/graph-state.type.ts';
import type { AtomPositions, BoxBounds } from '../common/atom-layout.type.ts';
import { ATOM_BOX_PREFIX } from '../common/graph-atom.const.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';
import type { RouteSegments } from '../common/route-segments.type.ts';

const UMBRELLA = 'app#e2e-ci';
const TARGET = 'lib#build';
const PLAIN = 'app#build';
const BOX_ID = `${ATOM_BOX_PREFIX}${UMBRELLA}`;
const LINK: GraphEdge = { source: UMBRELLA, target: TARGET };
const PLAIN_LINK: GraphEdge = { source: PLAIN, target: TARGET };
const LINK_ID = edgeIdOf(LINK);
const PLAIN_LINK_ID = edgeIdOf(PLAIN_LINK);
const UMBRELLA_AT: Position = { x: 0, y: 0 };
const TARGET_AT: Position = { x: 0, y: 200 };
const PLAIN_AT: Position = { x: 0, y: -200 };
const BASE: Positions = { [UMBRELLA]: UMBRELLA_AT, [TARGET]: TARGET_AT, [PLAIN]: PLAIN_AT };
const UNPLACED_TARGET: Positions = { [UMBRELLA]: UMBRELLA_AT, [PLAIN]: PLAIN_AT };
const BASE_START: Position = { x: 10, y: 16 };
const BASE_BENDS: Position[] = [{ x: 10, y: 100 }];
const BASE_END: Position = { x: 10, y: 184 };
const BASE_ROUTE: EdgeRoute = { start: BASE_START, bends: BASE_BENDS, end: BASE_END };
const PLAIN_START: Position = { x: 0, y: -184 };
const PLAIN_END: Position = { x: 0, y: -16 };
const PLAIN_ROUTE: EdgeRoute = { start: PLAIN_START, bends: [], end: PLAIN_END };
const ROUTES: Routes = { [LINK_ID]: BASE_ROUTE, [PLAIN_LINK_ID]: PLAIN_ROUTE };
const SIZES = new Map([[UMBRELLA, { width: 120, height: 32 }]]);
const BOX: BoxBounds = { x: -60, y: -16, width: 200, height: 116 };
const MOVED_TARGET_AT: Position = { x: 0, y: 400 };
const MOVED: Positions = { ...BASE, [TARGET]: MOVED_TARGET_AT };
const OPEN_BOXES = { [BOX_ID]: BOX };
const OPEN_ATOMS: AtomPositions = { positions: MOVED, boxes: OPEN_BOXES };
const SHIFTED_UMBRELLA_AT: Position = { x: 300, y: 50 };
const SHIFTED_TARGET_AT: Position = { x: 300, y: 250 };
const SHIFTED: Positions = { ...BASE, [UMBRELLA]: SHIFTED_UMBRELLA_AT, [TARGET]: SHIFTED_TARGET_AT };
const SHIFTED_ATOMS: AtomPositions = { positions: SHIFTED, boxes: {} };

const placementOf = (links: GraphEdge[], routes: Routes, base: Positions): AtomPlacement => {
  const shown = new Set([UMBRELLA]);
  const placement: AtomPlacement = { shown, base, sizes: SIZES, pkgBoxes: new Map(), links, routes };

  return placement;
};

const PLACEMENT = placementOf([LINK, PLAIN_LINK], ROUTES, BASE);

const segmentsOf = (segWeights: number[], segDistances: number[], srcEnd: string, tgtEnd: string): RouteSegments => {
  const segments: RouteSegments = { segWeights, segDistances, srcEnd, tgtEnd };

  return segments;
};

describe('FEATURE: openUmbrellaRouteOf', () => {
  describe('GIVEN a link whose umbrella opened a box and whose target moved down', () => {
    it('WHEN its route is built THEN it runs straight from the box bottom, at the base start x offset, to the target at the base end offset', () => {
      const expectedStart: Position = { x: 10, y: 100 };
      const expectedEnd: Position = { x: 10, y: 384 };
      const expected: EdgeRoute = { start: expectedStart, bends: [], end: expectedEnd };
      const now = { source: UMBRELLA_AT, target: MOVED_TARGET_AT };
      const base = { source: UMBRELLA_AT, target: TARGET_AT };

      const route = openUmbrellaRouteOf(BASE_ROUTE, base, now, BOX);

      expect(route).toStrictEqual(expected);
    });
  });
});

describe('FEATURE: umbrellaLinkSegmentsOf', () => {
  describe('GIVEN an umbrella link and a plain link, both routed', () => {
    it('WHEN the umbrella is open THEN only its link is drawn from the box bottom, on one bend halfway down its straight line', () => {
      const expected = new Map([[LINK_ID, segmentsOf([0.605], [-10], '10px 100px', '10px -16px')]]);

      const segments = umbrellaLinkSegmentsOf(PLACEMENT, OPEN_ATOMS);

      expect(segments).toStrictEqual(expected);
    });

    it('WHEN the umbrella is collapsed but shifted by another box THEN its link is on the segments of its base route', () => {
      const expected = new Map([[LINK_ID, segmentsOf([0.5], [-10], '10px 16px', '10px -16px')]]);

      const segments = umbrellaLinkSegmentsOf(PLACEMENT, SHIFTED_ATOMS);

      expect(segments).toStrictEqual(expected);
    });
  });

  describe('GIVEN an umbrella link with no route, as after a drag straightened it', () => {
    it('WHEN the umbrella is open THEN the link runs from the box bottom under the umbrella to the border of its target', () => {
      const expected = new Map([[LINK_ID, segmentsOf([0.625], [0], '0px 100px', 'outside-to-node')]]);
      const placement = placementOf([LINK], {}, BASE);

      const segments = umbrellaLinkSegmentsOf(placement, OPEN_ATOMS);

      expect(segments).toStrictEqual(expected);
    });

    it('WHEN the umbrella is collapsed THEN the link is drawn straight', () => {
      const expected = new Map([[LINK_ID, null]]);
      const placement = placementOf([LINK], {}, BASE);

      const segments = umbrellaLinkSegmentsOf(placement, SHIFTED_ATOMS);

      expect(segments).toStrictEqual(expected);
    });
  });

  describe('GIVEN a routed umbrella link whose ends now coincide', () => {
    it('WHEN the umbrella is open THEN the link is drawn straight', () => {
      const expected = new Map([[LINK_ID, null]]);
      const positions: Positions = { ...BASE, [TARGET]: UMBRELLA_AT };
      const atoms: AtomPositions = { positions, boxes: OPEN_BOXES };

      const segments = umbrellaLinkSegmentsOf(PLACEMENT, atoms);

      expect(segments).toStrictEqual(expected);
    });
  });

  describe('GIVEN an umbrella link whose target the base does not place', () => {
    it('WHEN the umbrella is open THEN the link is left out', () => {
      const placement = placementOf([LINK], ROUTES, UNPLACED_TARGET);

      const segments = umbrellaLinkSegmentsOf(placement, OPEN_ATOMS);

      expect(segments.size).toBe(0);
    });
  });
});
