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

const BOX_ROW: RowPlacement = { x: 108, y: 54, width: 284 };

const COLLAPSED_ROW: RowPlacement = { x: 108, y: 58, width: 284 };

describe('FEATURE: rowPlacementOf', () => {
  describe('GIVEN a folder box 300 px wide', () => {
    it.each([
      { kind: 'box' as const, expected: BOX_ROW },
      { kind: 'collapsed' as const, expected: COLLAPSED_ROW }
    ])('WHEN the row kind is $kind THEN it is placed at $expected', ({ kind, expected }) => {
      const placement = rowPlacementOf(BOX, kind);

      expect(placement).toStrictEqual(expected);
    });
  });

  describe('GIVEN a box near the 120 px minimum', () => {
    it.each([
      { width: 119, isPlaced: false },
      { width: 120, isPlaced: true }
    ])('WHEN it is $width px wide THEN a row placement exists is $isPlaced', ({ width, isPlaced }) => {
      const box = rectOf(0, 0, width, 100);

      const placement = rowPlacementOf(box, 'box');

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
