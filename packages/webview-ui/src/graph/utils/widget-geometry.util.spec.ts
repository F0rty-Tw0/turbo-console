import { describe, expect, it } from 'vitest';

import { buttonRectsOf, isWidgetShown, packageButtonRectOf, rowPlacementOf } from './widget-geometry.util.ts';
import type { LayerBounds, RectPx, RowButtonRects, RowPlacement } from '../common/widget.type.ts';

const rectOf = (x1: number, y1: number, x2: number, y2: number): RectPx => {
  const rect: RectPx = { x1, y1, x2, y2 };

  return rect;
};

const boundsOf = (overlayLeft: number | null): LayerBounds => {
  const bounds: LayerBounds = { width: 800, height: 600, overlayLeft };

  return bounds;
};

const BOX = rectOf(100, 50, 400, 300);

const BOX_ROW: RowPlacement = { x: 108, y: 54, width: 284, scale: 1 };

const COLLAPSED_ROW: RowPlacement = { x: 108, y: 58, width: 284, scale: 1 };

/** The docked 960 px editor's Fit zoom. */
const FIT_ZOOM = 0.658;

/** A collapsed node 180 px wide in graph px, as drawn at `zoom`. */
const collapsedAt = (zoom: number): RectPx => rectOf(100, 50, 100 + 180 * zoom, 50 + 56 * zoom);

describe('FEATURE: rowPlacementOf', () => {
  describe('GIVEN a folder box 300 px wide', () => {
    it.each([
      { kind: 'box' as const, expected: BOX_ROW },
      { kind: 'collapsed' as const, expected: COLLAPSED_ROW }
    ])('WHEN the row kind is $kind THEN it is placed at $expected', ({ kind, expected }) => {
      const placement = rowPlacementOf(BOX, kind, 1);

      expect(placement).toStrictEqual(expected);
    });
  });

  describe('GIVEN a folder box 300 px wide whose 32 px band is drawn at the camera zoom', () => {
    it.each([
      { zoom: 1, y: 54 },
      { zoom: 2, y: 70 },
      { zoom: 0.875, y: 52 }
    ])('WHEN the zoom is $zoom THEN the box row is full size and centred in the band at y $y', ({ zoom, y }) => {
      const placement = rowPlacementOf(BOX, 'box', zoom);

      expect(placement).toMatchObject({ x: 108, y, width: 284, scale: 1 });
    });

    it('WHEN the zoom is the 0.658 Fit THEN the row is scaled to about 0.71, 2 px clear inside the band, its drawn width the box minus scaled insets', () => {
      const scale = (32 * FIT_ZOOM - 4) / 24;
      const expected: RowPlacement = { x: BOX.x1 + 8 * scale, y: BOX.y1 + 2, width: (300 - 16 * scale) / scale, scale };

      const placement = rowPlacementOf(BOX, 'box', FIT_ZOOM);

      expect(scale).toBeCloseTo(0.7107, 4);
      expect(placement).toStrictEqual(expected);
    });

    it.each([
      { zoom: 0.5, isPlaced: true },
      { zoom: 0.49, isPlaced: false }
    ])('WHEN the zoom is $zoom, at the 0.5 scale floor THEN a box row exists is $isPlaced', ({ zoom, isPlaced }) => {
      const placement = rowPlacementOf(BOX, 'box', zoom);

      expect(placement !== null).toBe(isPlaced);
    });

    it('WHEN the zoom is 0.8 for a collapsed node 300 px wide THEN its row stays 8 px below the top, unscaled', () => {
      const placement = rowPlacementOf(BOX, 'collapsed', 0.8);

      expect(placement).toStrictEqual(COLLAPSED_ROW);
    });
  });

  describe('GIVEN a collapsed node 180 px wide whose 116 px widest label is drawn at the camera zoom', () => {
    it.each([
      { zoom: 2, isPlaced: true },
      { zoom: 1, isPlaced: true },
      { zoom: 0.99, isPlaced: false },
      { zoom: 0.667, isPlaced: false }
    ])('WHEN the zoom is $zoom THEN a row clear of the label exists is $isPlaced', ({ zoom, isPlaced }) => {
      const placement = rowPlacementOf(collapsedAt(zoom), 'collapsed', zoom);

      expect(placement !== null).toBe(isPlaced);
    });
  });

  describe('GIVEN a box near the 120 px minimum', () => {
    it.each([
      { width: 119, isPlaced: false },
      { width: 120, isPlaced: true }
    ])('WHEN it is $width px wide THEN a row placement exists is $isPlaced', ({ width, isPlaced }) => {
      const box = rectOf(0, 0, width, 100);

      const placement = rowPlacementOf(box, 'box', 1);

      expect(placement !== null).toBe(isPlaced);
    });
  });
});

describe('FEATURE: buttonRectsOf', () => {
  describe('GIVEN the row placed at x 108, y 54, 284 px wide', () => {
    it('WHEN the buttons are placed THEN the chevron starts the row and the ellipsis ends it', () => {
      const expected: RowButtonRects = { chevron: rectOf(108, 54, 132, 78), ellipsis: rectOf(368, 54, 392, 78) };

      const rects = buttonRectsOf(BOX_ROW);

      expect(rects).toStrictEqual(expected);
    });
  });

  describe('GIVEN the row at x 100, y 50, 200 px wide drawn at scale 0.5', () => {
    it('WHEN the buttons are placed THEN they are 12 px squares at the ends of its 100 px drawn width', () => {
      const row: RowPlacement = { x: 100, y: 50, width: 200, scale: 0.5 };
      const expected: RowButtonRects = { chevron: rectOf(100, 50, 112, 62), ellipsis: rectOf(188, 50, 200, 62) };

      const rects = buttonRectsOf(row);

      expect(rects).toStrictEqual(expected);
    });
  });
});

describe('FEATURE: packageButtonRectOf', () => {
  describe('GIVEN a node box', () => {
    it('WHEN the button is placed THEN it is a 24 px square centred on the top-right corner', () => {
      const box = rectOf(10, 20, 110, 50);

      const rect = packageButtonRectOf(box);

      expect(rect).toStrictEqual(rectOf(98, 8, 122, 32));
    });
  });
});

describe('FEATURE: isWidgetShown', () => {
  describe('GIVEN a layer 800 x 600 with no overlay', () => {
    it.each([
      { title: 'inside', rect: rectOf(100, 100, 124, 124), expected: true },
      { title: 'right edge exactly at 0', rect: rectOf(-24, 100, 0, 124), expected: false },
      { title: 'left edge exactly at the width', rect: rectOf(800, 100, 824, 124), expected: false },
      { title: 'straddling the right edge', rect: rectOf(790, 100, 814, 124), expected: true },
      { title: 'bottom edge exactly at 0', rect: rectOf(100, -24, 124, 0), expected: false },
      { title: 'top edge exactly at the height', rect: rectOf(100, 600, 124, 624), expected: false }
    ])('WHEN the rect is $title THEN shown is $expected', ({ rect, expected }) => {
      const isShown = isWidgetShown(rect, boundsOf(null));

      expect(isShown).toBe(expected);
    });
  });

  describe('GIVEN a details overlay starting at 520', () => {
    it.each([
      { x2: 520, expected: true },
      { x2: 521, expected: false }
    ])('WHEN the rect ends at $x2 THEN shown is $expected', ({ x2, expected }) => {
      const rect = rectOf(x2 - 24, 100, x2, 124);

      const isShown = isWidgetShown(rect, boundsOf(520));

      expect(isShown).toBe(expected);
    });
  });
});
