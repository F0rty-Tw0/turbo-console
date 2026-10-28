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
  const input: WidgetPlanInput = { rects: full, bounds: BOUNDS, isGrouped: true, ...overrides };

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
      { boxWidth: 175, isShown: false },
      { boxWidth: 176, isShown: true }
    ])('GIVEN a box row $boxWidth px wide WHEN planned THEN Focus folder shows is $isShown', ({ boxWidth, isShown }) => {
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

  it('GIVEN apps WHEN the overlay starts at x = 350 THEN Focus folder (340-364) is hidden while the chevron shows', () => {
    const boxes = new Map([['apps', APPS]]);
    const bounds: LayerBounds = { ...BOUNDS, overlayLeft: 350 };

    const plan = widgetPlanOf(inputOf({ boxes }, { bounds }));

    expect(plan.rows[0]).toMatchObject({ isChevronShown: true, isFocusShown: false });
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

    it('WHEN grouped THEN the package "…" is centred on its top-right corner', () => {
      const plan = widgetPlanOf(inputOf({ selected }));

      expect(plan.packageButton).toStrictEqual(rectOf(188, 68, 212, 92));
    });

    it('WHEN flat THEN there is no package "…"', () => {
      const plan = widgetPlanOf(inputOf({ selected }, { isGrouped: false }));

      expect(plan.packageButton).toBeNull();
    });

    it('WHEN the overlay starts left of its corner THEN there is no package "…"', () => {
      const bounds: LayerBounds = { ...BOUNDS, overlayLeft: 150 };

      const plan = widgetPlanOf(inputOf({ selected }, { bounds }));

      expect(plan.packageButton).toBeNull();
    });
  });

  it('GIVEN no selected package WHEN grouped THEN there is no package "…"', () => {
    const plan = widgetPlanOf(inputOf({}));

    expect(plan.packageButton).toBeNull();
  });
});
