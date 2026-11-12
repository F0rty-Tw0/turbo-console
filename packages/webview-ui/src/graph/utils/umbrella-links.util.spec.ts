import { describe, expect, it } from 'vitest';

import { edgeIdOf } from './edge-id.util.ts';
import { umbrellaLinkEndsOf } from './umbrella-links.util.ts';
import type { GraphEdge, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomPositions, BoxBounds } from '../common/atom-layout.type.ts';
import { ATOM_BOX_PREFIX } from '../common/graph-atom.const.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';

const UMBRELLA = 'app#e2e-ci';
const TARGET = 'lib#build';
const PLAIN = 'app#build';
const BOX_ID = `${ATOM_BOX_PREFIX}${UMBRELLA}`;
const LINK: GraphEdge = { source: UMBRELLA, target: TARGET };
const PLAIN_LINK: GraphEdge = { source: PLAIN, target: TARGET };
const LINK_ID = edgeIdOf(LINK);
const UMBRELLA_AT: Position = { x: 0, y: 0 };
const TARGET_AT: Position = { x: 0, y: 200 };
const PLAIN_AT: Position = { x: 0, y: -200 };
const BASE: Positions = { [UMBRELLA]: UMBRELLA_AT, [TARGET]: TARGET_AT, [PLAIN]: PLAIN_AT };
const SIZES = new Map([[UMBRELLA, { width: 120, height: 32 }]]);
const BOX: BoxBounds = { x: -60, y: -16, width: 200, height: 116 };
const MOVED_TARGET_AT: Position = { x: 0, y: 400 };
const MOVED: Positions = { ...BASE, [TARGET]: MOVED_TARGET_AT };
const OPEN_BOXES = { [BOX_ID]: BOX };
const OPEN_ATOMS: AtomPositions = { positions: MOVED, boxes: OPEN_BOXES };
const SHIFTED_UMBRELLA_AT: Position = { x: 300, y: 50 };
const SHIFTED: Positions = { ...BASE, [UMBRELLA]: SHIFTED_UMBRELLA_AT };
const SHIFTED_ATOMS: AtomPositions = { positions: SHIFTED, boxes: {} };
const UNPLACED_TARGET: Positions = { [UMBRELLA]: UMBRELLA_AT, [PLAIN]: PLAIN_AT };

const placementOf = (links: GraphEdge[]): AtomPlacement => {
  const shown = new Set([UMBRELLA]);
  const placement: AtomPlacement = { shown, base: BASE, sizes: SIZES, pkgBoxes: new Map(), links };

  return placement;
};

const PLACEMENT = placementOf([LINK, PLAIN_LINK]);

describe('FEATURE: umbrellaLinkEndsOf', () => {
  describe('GIVEN an umbrella link and a plain link', () => {
    it('WHEN the umbrella is open THEN only its link gets a source end, at the box bottom under the umbrella centre', () => {
      const expected = new Map([[LINK_ID, '0px 100px']]);

      const ends = umbrellaLinkEndsOf(PLACEMENT, OPEN_ATOMS);

      expect(ends).toStrictEqual(expected);
    });

    it('WHEN the umbrella is collapsed but shifted by another box THEN its link leaves the umbrella border', () => {
      const expected = new Map([[LINK_ID, null]]);

      const ends = umbrellaLinkEndsOf(PLACEMENT, SHIFTED_ATOMS);

      expect(ends).toStrictEqual(expected);
    });
  });

  describe('GIVEN an umbrella link whose target is not placed', () => {
    it('WHEN the umbrella is open THEN the link is left out', () => {
      const atoms: AtomPositions = { positions: UNPLACED_TARGET, boxes: OPEN_BOXES };

      const ends = umbrellaLinkEndsOf(placementOf([LINK]), atoms);

      expect(ends.size).toBe(0);
    });
  });
});
