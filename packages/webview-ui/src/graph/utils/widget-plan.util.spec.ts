import { describe, expect, it } from 'vitest';

import { widgetPlanOf } from './widget-plan.util.ts';
import type { FolderRect, LayerBounds, RectPx, RowPlan, WidgetPlanInput, WidgetRects } from '../common/widget.type.ts';

const rectOf = (x1: number, y1: number, x2: number, y2: number): RectPx => {
  const rect: RectPx = { x1, y1, x2, y2 };

  return rect;
};

/** A drawn folder at `{x1, y1, x2, y2}`, its plain-border width its rect's. */
const folderOf = (x1: number, y1: number, x2: number, y2: number): FolderRect => {
  const rect = rectOf(x1, y1, x2, y2);
  const folder: FolderRect = { rect, width: x2 - x1 };

  return folder;
};

const BOUNDS: LayerBounds = { width: 1000, height: 600, overlayLeft: null };

const APPS = folderOf(100, 50, 400, 300);

const PACKAGES = folderOf(500, 50, 800, 300);

const NO_RECTS: WidgetRects = { boxes: new Map(), collapsed: new Map(), selected: null, zoom: 1 };

const inputOf = (rects: Partial<WidgetRects>, overrides: Partial<WidgetPlanInput> = {}): WidgetPlanInput => {
  const full: WidgetRects = { ...NO_RECTS, ...rects };
  const input: WidgetPlanInput = { rects: full, bounds: BOUNDS, isGrouped: true, toolbarCount: 1, ...overrides };

  return input;
};

const boxRowOf = (folder: string, x: number): RowPlan => {
  const placement = { x, y: 54, width: 284, scale: 1 };
  const row: RowPlan = { folder, kind: 'box', placement, isChevronShown: true, isFocusShown: true, isEllipsisShown: true };

  return row;
};

const foldersOf = (rows: RowPlan[]): string[] => rows.map((row): string => row.folder);

describe('FEATURE: widgetPlanOf', () => {
  describe('GIVEN the boxes apps and packages, both 300 px wide', () => {
    const boxes = new Map([
      ['apps', APPS],
      ['packages', PACKAGES]
    ]);

    it('WHEN nothing covers them THEN each gets a box row with both buttons shown, in map order', () => {
      const plan = widgetPlanOf(inputOf({ boxes }));

      expect(plan.rows).toStrictEqual([boxRowOf('apps', 108), boxRowOf('packages', 508)]);
    });

    describe('WHEN the overlay starts at x = 700', () => {
      const bounds: LayerBounds = { ...BOUNDS, overlayLeft: 700 };

      it('THEN the packages chevron, ending at x = 532, stays shown', () => {
        const plan = widgetPlanOf(inputOf({ boxes }, { bounds }));

        expect(plan.rows[1]?.isChevronShown).toBe(true);
      });

      it('THEN the packages "…", starting at x = 768, is hidden', () => {
        const plan = widgetPlanOf(inputOf({ boxes }, { bounds }));

        expect(plan.rows[1]?.isEllipsisShown).toBe(false);
      });
    });
  });

  describe('GIVEN a box row near the Focus folder minimum', () => {
    it.each([
      { boxWidth: 183, isShown: false },
      { boxWidth: 184, isShown: true }
    ])('WHEN a box row $boxWidth px wide is planned THEN Focus folder shown is $isShown', ({ boxWidth, isShown }) => {
      const boxes = new Map([['apps', folderOf(100, 50, 100 + boxWidth, 300)]]);

      const plan = widgetPlanOf(inputOf({ boxes }));

      expect(plan.rows[0]?.isFocusShown).toBe(isShown);
    });
  });

  describe('GIVEN boxes the layer cannot show a row for', () => {
    it('WHEN a box is 119 px wide THEN it gets no row', () => {
      const boxes = new Map([['apps', folderOf(100, 50, 219, 300)]]);

      const plan = widgetPlanOf(inputOf({ boxes }));

      expect(plan.rows).toStrictEqual([]);
    });

    it('WHEN a box lies wholly left of x = 0 THEN it gets no row', () => {
      const boxes = new Map([['apps', folderOf(-400, 50, -100, 300)]]);

      const plan = widgetPlanOf(inputOf({ boxes }));

      expect(plan.rows).toStrictEqual([]);
    });
  });

  describe('GIVEN apps', () => {
    it('WHEN the overlay starts at x = 350 THEN Focus folder (340-364) is hidden while the chevron shows', () => {
      const boxes = new Map([['apps', APPS]]);
      const bounds: LayerBounds = { ...BOUNDS, overlayLeft: 350 };

      const plan = widgetPlanOf(inputOf({ boxes }, { bounds }));

      expect(plan.rows[0]).toMatchObject({ isChevronShown: true, isFocusShown: false });
    });

    it('WHEN the overlay starts at x = 380 THEN Focus folder hides with the "…"', () => {
      const boxes = new Map([['apps', APPS]]);
      const bounds: LayerBounds = { ...BOUNDS, overlayLeft: 380 };

      const plan = widgetPlanOf(inputOf({ boxes }, { bounds }));

      expect(plan.rows[0]).toMatchObject({ isFocusShown: false, isEllipsisShown: false });
    });
  });

  it('GIVEN the box apps at zoom 0.49, where its row would be under half size WHEN planned THEN it gets no row', () => {
    const boxes = new Map([['apps', APPS]]);

    const plan = widgetPlanOf(inputOf({ boxes, zoom: 0.49 }));

    expect(plan.rows).toStrictEqual([]);
  });

  it('GIVEN a collapsed node 180 by 56 px WHEN planned THEN it gets a collapsed row 8 px below its top', () => {
    const collapsed = new Map([['apps', folderOf(100, 100, 280, 156)]]);

    const plan = widgetPlanOf(inputOf({ collapsed }));
    const placement = { y: 108 };

    expect(plan.rows[0]).toMatchObject({ folder: 'apps', kind: 'collapsed', placement });
  });

  it('GIVEN the folder keys __proto__ and the root folder WHEN planned THEN both get a row under their own key', () => {
    const boxes = new Map([
      ['__proto__', APPS],
      ['', PACKAGES]
    ]);

    const plan = widgetPlanOf(inputOf({ boxes }));

    expect(foldersOf(plan.rows)).toStrictEqual(['__proto__', '']);
  });

  describe('GIVEN a selected package drawn at {120, 80, 200, 110}', () => {
    const selected = rectOf(120, 80, 200, 110);

    it('WHEN grouped THEN its node toolbar sits 4 px above its top-right, right edges level', () => {
      const plan = widgetPlanOf(inputOf({ selected }));

      expect(plan.nodeToolbar).toStrictEqual(rectOf(176, 52, 200, 76));
    });

    it('WHEN flat THEN there is no node toolbar', () => {
      const plan = widgetPlanOf(inputOf({ selected }, { isGrouped: false }));

      expect(plan.nodeToolbar).toBeNull();
    });

    it('WHEN the overlay starts at 150, left of its right edge THEN there is no node toolbar', () => {
      const bounds: LayerBounds = { ...BOUNDS, overlayLeft: 150 };

      const plan = widgetPlanOf(inputOf({ selected }, { bounds }));

      expect(plan.nodeToolbar).toBeNull();
    });

    it.each([
      { zoom: 0.49, expected: rectOf(176, 52, 200, 76) },
      { zoom: 0.5, expected: rectOf(92, 52, 200, 76) }
    ])('WHEN the full toolbar has 4 buttons, at zoom $zoom THEN its node toolbar is $expected', ({ zoom, expected }) => {
      const plan = widgetPlanOf(inputOf({ selected, zoom }, { toolbarCount: 4 }));

      expect(plan.nodeToolbar).toStrictEqual(expected);
    });
  });

  describe('GIVEN a selected package at a layer edge', () => {
    it.each([
      { name: 'its bottom edge 2 px above the layer top', selected: rectOf(120, -30, 200, -2) },
      { name: 'its top edge at the layer bottom', selected: rectOf(120, 600, 200, 630) }
    ])('WHEN $name THEN there is no node toolbar', ({ selected }) => {
      const plan = widgetPlanOf(inputOf({ selected }));

      expect(plan.nodeToolbar).toBeNull();
    });
  });

  describe('GIVEN the apps box at zoom 1, its row at y 54-78', () => {
    const boxes = new Map([['apps', APPS]]);

    it('WHEN a package in its top row, {120, 82, 200, 114}, is selected THEN its node toolbar flips 4 px under it', () => {
      const selected = rectOf(120, 82, 200, 114);

      const plan = widgetPlanOf(inputOf({ boxes, selected }));

      expect(plan.nodeToolbar).toStrictEqual(rectOf(176, 118, 200, 142));
    });

    it('WHEN a package lower in the box, {120, 160, 200, 192}, is selected THEN its node toolbar stays above it', () => {
      const selected = rectOf(120, 160, 200, 192);

      const plan = widgetPlanOf(inputOf({ boxes, selected }));

      expect(plan.nodeToolbar).toStrictEqual(rectOf(176, 132, 200, 156));
    });
  });

  describe('GIVEN the collapsed node {100, 40, 280, 96}, its row at y 48-72', () => {
    const collapsed = new Map([['core', folderOf(100, 40, 280, 96)]]);

    it('WHEN the package {150, 96, 230, 126} under it is selected THEN its node toolbar flips under it', () => {
      const selected = rectOf(150, 96, 230, 126);

      const plan = widgetPlanOf(inputOf({ collapsed, selected }));

      expect(plan.nodeToolbar).toStrictEqual(rectOf(206, 130, 230, 154));
    });
  });

  it('GIVEN no selected package WHEN grouped THEN there is no node toolbar', () => {
    const plan = widgetPlanOf(inputOf({}));

    expect(plan.nodeToolbar).toBeNull();
  });
});
