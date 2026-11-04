import { beforeAll, describe, expect, it } from 'vitest';

import type { LayoutQuality } from '../test/common/layout-quality.type.ts';
import { REAL_ELK_HOOK_TIMEOUT_MS, REAL_ELK_TIMEOUT_MS } from '../test/common/real-elk.const.ts';
import type { U0TaskView, U0View } from '../test/common/u0-workspace.type.ts';
import {
  FIT_BOUNDS_STUB,
  FIT_CANVAS_STUB,
  FOREIGN_BAND_STUB,
  FOREIGN_BODY_STUB,
  NESTED_BOXES_STUB,
  OVERLAPPING_BOXES_STUB
} from '../test/stubs/layout-boxes.stub.ts';
import {
  CROSSING_ROUTES_STUB,
  MIDPOINT_UNDER_STUB,
  OWN_BANDS_STUB,
  SHARED_END_ROUTES_STUB,
  THROUGH_LEAF_STUB
} from '../test/stubs/layout-quality.stub.ts';
import { U0_CANVAS_STUB } from '../test/stubs/u0-workspace.stub.ts';
import { qualityOf } from '../test/utils/layout-quality.spec.util.ts';
import {
  sortedEdgeIdsOf,
  sortedLeafIdsOf,
  u0CapturedEdgeIdsOf,
  u0InputOf,
  u0QualitiesOf,
  u0ShownIdsOf
} from '../test/utils/u0-layout.spec.util.ts';

const TASK_VIEWS: [U0View, U0TaskView][] = [
  ['allTasksFlat', 'allTasks'],
  ['allTasksGrouped', 'allTasks'],
  ['formatOnlyFlat', 'formatOnly'],
  ['formatOnlyGrouped', 'formatOnly'],
  ['lintTypecheckUnitFlat', 'lintTypecheckUnit'],
  ['lintTypecheckUnitGrouped', 'lintTypecheckUnit']
];

const ALL_VIEWS: U0View[] = [
  'pkgFlat',
  'pkgGrouped',
  'allTasksFlat',
  'allTasksGrouped',
  'formatOnlyFlat',
  'formatOnlyGrouped',
  'lintTypecheckUnitFlat',
  'lintTypecheckUnitGrouped'
];

/** pkgFlat has no box, so it has no title band to cross. */
const C7_VIEWS: U0View[] = ALL_VIEWS.filter((view) => view !== 'pkgFlat');

/**
 * Task 3.1 thresholds: Flat rows 25% of the way from P1 toward master; Grouped rows no worse than master (F-U6-4).
 * allTasksFlat is over the thorough cap, so its P1 is thoroughness 1 (420 crossings).
 */
const C2B_ROWS: [U0View, number][] = [
  ['allTasksFlat', 476],
  ['allTasksGrouped', 399]
];

const C3_ROWS: [U0View, number][] = [
  ['allTasksFlat', 0.28],
  ['allTasksGrouped', 0.18]
];

const C4_ROWS: [U0View, number][] = [
  ['formatOnlyFlat', 0.77],
  ['formatOnlyGrouped', 0.59]
];

const C5_ROWS: [U0View, number][] = [
  ['lintTypecheckUnitFlat', 0.46],
  ['lintTypecheckUnitGrouped', 0.4]
];

const C4_ASPECT_MAX = 2;

describe('FEATURE: layout quality of the U0 workspace with real elkjs', { timeout: REAL_ELK_TIMEOUT_MS }, () => {
  describe('GIVEN the U0 stub', () => {
    it('WHEN the flat package graph is built THEN its edge ids equal the captured pkgFlat request', () => {
      const input = u0InputOf('pkgFlat');

      const edgeIds = sortedEdgeIdsOf(input);

      expect(edgeIds).toStrictEqual(u0CapturedEdgeIdsOf('pkgFlat'));
    });

    it.each(TASK_VIEWS)('WHEN %s is built THEN its leaf and edge ids equal the capture', (view, taskView) => {
      const input = u0InputOf(view);

      const ids = { leaves: sortedLeafIdsOf(input), edges: sortedEdgeIdsOf(input) };

      expect(ids).toStrictEqual({ leaves: u0ShownIdsOf(taskView), edges: u0CapturedEdgeIdsOf(view) });
    });
  });

  describe('GIVEN each U0 view laid out by its production builder', () => {
    let quality: Readonly<Record<U0View, LayoutQuality>>;

    beforeAll(async () => {
      quality = await u0QualitiesOf();
    }, REAL_ELK_HOOK_TIMEOUT_MS);

    describe('WHEN each is scored', () => {
      it('THEN c1: the flat package view fits at zoom 1.40 or more', () => {
        expect(quality.pkgFlat.fitZoom).toBeGreaterThanOrEqual(1.4);
      });

      it('THEN c2: the flat package view has 10 crossings or fewer', () => {
        expect(quality.pkgFlat.crossings).toBeLessThanOrEqual(10);
      });

      it.each(C2B_ROWS)('THEN c2b: %s has at most %i crossings', (view, most) => {
        expect(quality[view].crossings).toBeLessThanOrEqual(most);
      });

      it.each(C3_ROWS)('THEN c3: %s fits at zoom %f or more', (view, least) => {
        expect(quality[view].fitZoom).toBeGreaterThanOrEqual(least);
      });

      it.each(C4_ROWS)('THEN c4: %s fits at zoom %f or more', (view, least) => {
        expect(quality[view].fitZoom).toBeGreaterThanOrEqual(least);
      });

      it.each(C4_ROWS)('THEN c4: %s fits a box at most twice as wide as high', (view) => {
        expect(quality[view].fitAspect).toBeLessThanOrEqual(C4_ASPECT_MAX);
      });

      it.each(C5_ROWS)('THEN c5: %s fits at zoom %f or more', (view, least) => {
        expect(quality[view].fitZoom).toBeGreaterThanOrEqual(least);
      });

      it('THEN c5: lintTypecheckUnitGrouped has at most 234 crossings', () => {
        expect(quality.lintTypecheckUnitGrouped.crossings).toBeLessThanOrEqual(234);
      });

      it.each(ALL_VIEWS)(
        'THEN c6: %s routes every edge, through no leaf, with no midpoint under a leaf and no box overlap',
        (view) => {
          const { routeCount, edgeCount, throughNode, midpointUnder, boxOverlap } = quality[view];

          expect({ routeCount, throughNode, midpointUnder, boxOverlap }).toStrictEqual({
            routeCount: edgeCount,
            throughNode: 0,
            midpointUnder: 0,
            boxOverlap: 0
          });
        }
      );

      it.each(C7_VIEWS)('THEN c7: %s crosses no foreign title band and no foreign box', (view) => {
        const { overHeader, foreignBox } = quality[view];

        expect({ overHeader, foreignBox }).toStrictEqual({ overHeader: 0, foreignBox: 0 });
      });
    });
  });

  describe('GIVEN hand-built laid-out graphs', () => {
    it('WHEN two routes cross once with no end shared THEN crossings is 1', () => {
      const { crossings } = qualityOf(CROSSING_ROUTES_STUB, CROSSING_ROUTES_STUB, U0_CANVAS_STUB);

      expect(crossings).toBe(1);
    });

    it('WHEN two crossing routes share an end THEN crossings is 0', () => {
      const { crossings } = qualityOf(SHARED_END_ROUTES_STUB, SHARED_END_ROUTES_STUB, U0_CANVAS_STUB);

      expect(crossings).toBe(0);
    });

    it('WHEN a route runs through a third leaf THEN throughNode is 1', () => {
      const { throughNode } = qualityOf(THROUGH_LEAF_STUB, THROUGH_LEAF_STUB, U0_CANVAS_STUB);

      expect(throughNode).toBe(1);
    });

    it('WHEN a route has its half-length point inside a third leaf it only grazes THEN midpointUnder is 1 and throughNode is 0', () => {
      const { midpointUnder, throughNode } = qualityOf(MIDPOINT_UNDER_STUB, MIDPOINT_UNDER_STUB, U0_CANVAS_STUB);

      expect({ midpointUnder, throughNode }).toStrictEqual({ midpointUnder: 1, throughNode: 0 });
    });

    it('WHEN a route crosses the title band of a box that holds neither end THEN overHeader and foreignBox are 1', () => {
      const { overHeader, ownHeader, foreignBox } = qualityOf(FOREIGN_BAND_STUB, FOREIGN_BAND_STUB, U0_CANVAS_STUB);

      expect({ overHeader, ownHeader, foreignBox }).toStrictEqual({ overHeader: 1, ownHeader: 0, foreignBox: 1 });
    });

    it('WHEN a route crosses only the body of a box that holds neither end THEN foreignBox is 1 and overHeader is 0', () => {
      const { overHeader, foreignBox } = qualityOf(FOREIGN_BODY_STUB, FOREIGN_BODY_STUB, U0_CANVAS_STUB);

      expect({ overHeader, foreignBox }).toStrictEqual({ overHeader: 0, foreignBox: 1 });
    });

    it('WHEN two sibling boxes overlap THEN boxOverlap is 1', () => {
      const { boxOverlap } = qualityOf(OVERLAPPING_BOXES_STUB, OVERLAPPING_BOXES_STUB, U0_CANVAS_STUB);

      expect(boxOverlap).toBe(1);
    });

    it('WHEN one box holds another THEN boxOverlap is 0', () => {
      const { boxOverlap } = qualityOf(NESTED_BOXES_STUB, NESTED_BOXES_STUB, U0_CANVAS_STUB);

      expect(boxOverlap).toBe(0);
    });

    it('WHEN boxes, leaves and a route bend bound the drawing at 123 × 71.5 THEN fitZoom is 1 on a canvas 123 px wide inside its margins', () => {
      const { fitZoom } = qualityOf(FIT_BOUNDS_STUB, FIT_BOUNDS_STUB, FIT_CANVAS_STUB);

      expect(fitZoom).toBe(1);
    });

    it('WHEN boxes, leaves and a route bend bound the drawing at 123 × 71.5 THEN fitAspect is 123 over 71.5', () => {
      const { fitAspect } = qualityOf(FIT_BOUNDS_STUB, FIT_BOUNDS_STUB, FIT_CANVAS_STUB);

      expect(fitAspect).toBeCloseTo(123 / 71.5, 10);
    });

    it('WHEN a route enters its end through the bands of its package box and folder THEN both count as own bands', () => {
      const { ownHeader, overHeader, foreignBox } = qualityOf(OWN_BANDS_STUB, OWN_BANDS_STUB, U0_CANVAS_STUB);

      expect({ ownHeader, overHeader, foreignBox }).toStrictEqual({ ownHeader: 2, overHeader: 0, foreignBox: 0 });
    });
  });
});
