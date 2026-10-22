import { describe, expect, it } from 'vitest';

import { menuPlaceOf, uncoveredAreaOf } from './menu-place.util.ts';
import type { LayerBounds, Point, RectPx, Size } from '../common/widget.type.ts';

const rectOf = (x1: number, y1: number, x2: number, y2: number): RectPx => {
  const rect: RectPx = { x1, y1, x2, y2 };

  return rect;
};

const sizeOf = (width: number, height: number): Size => {
  const size: Size = { width, height };

  return size;
};

const OVERLAID: LayerBounds = { width: 800, height: 600, overlayLeft: 520 };

const AREA = rectOf(0, 0, 520, 600);

const NO_OVERLAY: LayerBounds = { ...OVERLAID, overlayLeft: null };

const pointOf = (x: number, y: number): Point => {
  const point: Point = { x, y };

  return point;
};

describe('FEATURE: uncoveredAreaOf', () => {
  describe('GIVEN a layer 800 x 600', () => {
    it.each([
      { title: 'a details overlay at 520', bounds: OVERLAID, expected: AREA },
      { title: 'no overlay', bounds: NO_OVERLAY, expected: rectOf(0, 0, 800, 600) }
    ])('WHEN it has $title THEN the area is $expected', ({ bounds, expected }) => {
      const area = uncoveredAreaOf(bounds);

      expect(area).toStrictEqual(expected);
    });
  });
});

describe('FEATURE: menuPlaceOf', () => {
  describe('GIVEN the uncovered area 0,0 to 520,600', () => {
    it.each([
      { title: 'room below and right', anchor: rectOf(100, 50, 124, 74), menu: sizeOf(160, 120), expected: pointOf(100, 74) },
      { title: 'no room right: flips left', anchor: rectOf(500, 50, 524, 74), menu: sizeOf(160, 120), expected: pointOf(364, 74) },
      { title: 'no room below: flips up', anchor: rectOf(100, 560, 124, 584), menu: sizeOf(160, 120), expected: pointOf(100, 440) },
      {
        title: 'wider than the area: clamps left',
        anchor: rectOf(100, 50, 124, 74),
        menu: sizeOf(700, 120),
        expected: pointOf(0, 74)
      },
      {
        title: 'taller than the area: clamps top',
        anchor: rectOf(100, 50, 124, 74),
        menu: sizeOf(160, 700),
        expected: pointOf(100, 0)
      }
    ])('WHEN $title THEN the menu opens at $expected', ({ anchor, menu, expected }) => {
      const place = menuPlaceOf(anchor, menu, AREA);

      expect(place).toStrictEqual(expected);
    });
  });

  describe('GIVEN an area that ends at the full width 800', () => {
    it('WHEN the menu fits before 800 THEN it does not flip', () => {
      const area = uncoveredAreaOf(NO_OVERLAY);

      const place = menuPlaceOf(rectOf(500, 50, 524, 74), sizeOf(160, 120), area);

      expect(place).toStrictEqual(pointOf(500, 74));
    });
  });
});
