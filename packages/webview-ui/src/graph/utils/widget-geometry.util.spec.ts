import { describe, expect, it } from 'vitest';

import { buttonRectsOf, isWidgetShown, overlayLeftOf, packageButtonRectOf, rowPlacementOf } from './widget-geometry.util.ts';
import type { FolderRect, LayerBounds, RectPx, RowButtonRects, RowPlacement } from '../common/widget.type.ts';

const rectOf = (x1: number, y1: number, x2: number, y2: number): RectPx => {
  const rect: RectPx = { x1, y1, x2, y2 };

  return rect;
};

const boundsOf = (overlayLeft: number | null): LayerBounds => {
  const bounds: LayerBounds = { width: 800, height: 600, overlayLeft };

  return bounds;
};

/** A drawn folder whose plain-border width is `width`, its rect's width unless a thicker border widens the rect. */
const folderOf = (rect: RectPx, width = rect.x2 - rect.x1): FolderRect => {
  const folder: FolderRect = { rect, width };

  return folder;
};

const BOX = rectOf(100, 50, 400, 300);

const BOX_FOLDER = folderOf(BOX);

const BOX_ROW: RowPlacement = { x: 108, y: 54, width: 284, scale: 1 };

const COLLAPSED_ROW: RowPlacement = { x: 108, y: 58, width: 284, scale: 1 };

/** The docked 960 px editor's Fit zoom. */
const FIT_ZOOM = 0.658;

/** Half the widest collapsed-node label, 116 px, centred on the node. */
const HALF_LABEL_PX = 58;

/** Room for float error where the row's corner exactly meets the widest label. */
const FLOAT_EPSILON = 1e-9;

/** NaN edges in place of a missing row, so every clearance check fails. */
const NO_ROW: RowPlacement = { x: Number.NaN, y: Number.NaN, width: Number.NaN, scale: 1 };

/** A collapsed node 180 px wide in graph px, as drawn at `zoom`. */
const collapsedAt = (zoom: number): FolderRect => folderOf(rectOf(100, 50, 100 + 180 * zoom, 50 + 56 * zoom));

describe('FEATURE: rowPlacementOf', () => {
  describe('GIVEN a folder box 300 px wide', () => {
    it.each([
      { kind: 'box' as const, expected: BOX_ROW },
      { kind: 'collapsed' as const, expected: COLLAPSED_ROW }
    ])('WHEN the row kind is $kind THEN it is placed at $expected', ({ kind, expected }) => {
      const placement = rowPlacementOf(BOX_FOLDER, kind, 1);

      expect(placement).toStrictEqual(expected);
    });
  });

  describe('GIVEN a folder box 300 px wide whose 32 px band is drawn at the camera zoom', () => {
    it.each([
      { zoom: 1, y: 54 },
      { zoom: 2, y: 70 },
      { zoom: 0.875, y: 52 }
    ])('WHEN the zoom is $zoom THEN the box row is full size and centred in the band at y $y', ({ zoom, y }) => {
      const placement = rowPlacementOf(BOX_FOLDER, 'box', zoom);

      expect(placement).toMatchObject({ x: 108, y, width: 284, scale: 1 });
    });

    it('WHEN the zoom is the 0.658 Fit THEN the row is scaled to about 0.71, 2 px clear inside the band, its drawn width the box minus scaled insets', () => {
      const scale = (32 * FIT_ZOOM - 4) / 24;
      const expected: RowPlacement = { x: BOX.x1 + 8 * scale, y: BOX.y1 + 2, width: (300 - 16 * scale) / scale, scale };

      const placement = rowPlacementOf(BOX_FOLDER, 'box', FIT_ZOOM);

      expect(scale).toBeCloseTo(0.7107, 4);
      expect(placement).toStrictEqual(expected);
    });

    it.each([
      { zoom: 0.5, isPlaced: true },
      { zoom: 0.49, isPlaced: false }
    ])('WHEN the zoom is $zoom, at the 0.5 scale floor THEN a box row exists is $isPlaced', ({ zoom, isPlaced }) => {
      const placement = rowPlacementOf(BOX_FOLDER, 'box', zoom);

      expect(placement !== null).toBe(isPlaced);
    });
  });

  describe('GIVEN a collapsed node 300 px wide', () => {
    it.each([
      { zoom: 2, scale: 1 },
      { zoom: 1, scale: 1 },
      { zoom: 0.66, scale: 0.66 }
    ])('WHEN the zoom is $zoom THEN its row is drawn at scale $scale, 8 px in at that scale', ({ zoom, scale }) => {
      const inset = 8 * scale;
      const expected: RowPlacement = { x: BOX.x1 + inset, y: BOX.y1 + inset, width: (300 - 2 * inset) / scale, scale };

      const placement = rowPlacementOf(BOX_FOLDER, 'collapsed', zoom);

      expect(placement).toStrictEqual(expected);
    });

    it('WHEN the zoom is 0.49, under the 0.5 scale floor THEN it has no row', () => {
      const placement = rowPlacementOf(BOX_FOLDER, 'collapsed', 0.49);

      expect(placement).toBeNull();
    });
  });

  describe('GIVEN a collapsed node 180 px wide whose 116 px widest label is centred on it at the camera zoom', () => {
    it.each([2, 1, 0.8, 0.667])(
      'WHEN the zoom is %s THEN its chevron ends left of the label and its "…" starts right of it',
      (zoom) => {
        const node = collapsedAt(zoom);
        const centre = (node.rect.x1 + node.rect.x2) / 2;
        const row = rowPlacementOf(node, 'collapsed', zoom) ?? NO_ROW;

        const { chevron, ellipsis } = buttonRectsOf(row);

        expect(chevron.x2).toBeLessThanOrEqual(centre - HALF_LABEL_PX * zoom + FLOAT_EPSILON);
        expect(ellipsis.x1).toBeGreaterThanOrEqual(centre + HALF_LABEL_PX * zoom - FLOAT_EPSILON);
      }
    );

    it('WHEN the zoom is 0.66, drawing it under 120 px THEN it has no row', () => {
      const placement = rowPlacementOf(collapsedAt(0.66), 'collapsed', 0.66);

      expect(placement).toBeNull();
    });
  });

  describe('GIVEN a box near the 120 px minimum', () => {
    it.each([
      { width: 119, isPlaced: false },
      { width: 120, isPlaced: true }
    ])('WHEN it is $width px wide THEN a row placement exists is $isPlaced', ({ width, isPlaced }) => {
      const box = folderOf(rectOf(0, 0, width, 100));

      const placement = rowPlacementOf(box, 'box', 1);

      expect(placement !== null).toBe(isPlaced);
    });
  });

  describe('GIVEN a folder drawn selected at zoom 0.655, its 3 px border widening its 119.9 px plain-border width to a 121.2 px rect', () => {
    const selected = folderOf(rectOf(100, 50, 100 + 185 * 0.655, 50 + 61 * 0.655), 183 * 0.655);

    it.each(['box' as const, 'collapsed' as const])('WHEN the row kind is %s THEN it has no row', (kind) => {
      const placement = rowPlacementOf(selected, kind, 0.655);

      expect(placement).toBeNull();
    });
  });

  describe('GIVEN a folder whose 300 px rect is 2 px wider than its plain-border width', () => {
    it('WHEN the row is placed THEN it spans the rect, not the plain-border width', () => {
      const folder = folderOf(BOX, 298);

      const placement = rowPlacementOf(folder, 'box', 1);

      expect(placement).toStrictEqual(BOX_ROW);
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

describe('FEATURE: overlayLeftOf', () => {
  const container = { offsetLeft: 40 };

  it.each([
    { title: 'overlays the canvas', isOverlay: true, hidden: false, expected: 260 },
    { title: 'docks beside the canvas', isOverlay: false, hidden: false, expected: null },
    { title: 'is closed', isOverlay: true, hidden: true, expected: null }
  ])('GIVEN a panel at 300 WHEN it $title THEN its left edge in container px is $expected', ({ isOverlay, hidden, expected }) => {
    const panel = { offsetLeft: 300, hidden };

    expect(overlayLeftOf(panel, container, isOverlay)).toBe(expected);
  });

  it('GIVEN no panel WHEN the overlay layout is on THEN there is no edge', () => {
    expect(overlayLeftOf(null, container, true)).toBeNull();
  });
});
