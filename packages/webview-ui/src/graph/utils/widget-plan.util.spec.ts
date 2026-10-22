import { describe, expect, it } from 'vitest';

import { widgetPlanOf } from './widget-plan.util.ts';
import type { LayerBounds, RectPx, RowPlan, WidgetPlanInput, WidgetRects } from '../common/widget.type.ts';

const rectOf = (x1: number, y1: number, x2: number, y2: number): RectPx => {
  const rect: RectPx = { x1, y1, x2, y2 };

  return rect;
};

const BOUNDS: LayerBounds = { width: 1000, height: 600, overlayLeft: null };

const APPS = rectOf(100, 50, 400, 300);

const PACKAGES = rectOf(500, 50, 800, 300);

const NO_RECTS: WidgetRects = { boxes: new Map(), collapsed: new Map(), selected: null };

const inputOf = (rects: Partial<WidgetRects>, overrides: Partial<WidgetPlanInput> = {}): WidgetPlanInput => {
  const full: WidgetRects = { ...NO_RECTS, ...rects };
  const input: WidgetPlanInput = { rects: full, bounds: BOUNDS, isGrouped: true, ...overrides };

  return input;
};

const boxRowOf = (folder: string, x: number): RowPlan => {
  const placement = { x, y: 54, width: 284 };
  const row: RowPlan = { folder, kind: 'box', placement, isChevronShown: true, isEllipsisShown: true };

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

  describe('GIVEN boxes the layer cannot show a row for', () => {
    it('WHEN a box is 119 px wide THEN it gets no row', () => {
      const boxes = new Map([['apps', rectOf(100, 50, 219, 300)]]);

      const plan = widgetPlanOf(inputOf({ boxes }));

      expect(plan.rows).toStrictEqual([]);
    });

    it('WHEN a box lies wholly left of x = 0 THEN it gets no row', () => {
      const boxes = new Map([['apps', rectOf(-400, 50, -100, 300)]]);

      const plan = widgetPlanOf(inputOf({ boxes }));

      expect(plan.rows).toStrictEqual([]);
    });
  });

  it('GIVEN a collapsed node 180 by 56 px WHEN planned THEN it gets a collapsed row 8 px below its top', () => {
    const collapsed = new Map([['apps', rectOf(100, 100, 280, 156)]]);

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
