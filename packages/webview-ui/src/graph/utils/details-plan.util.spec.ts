import { describe, expect, it } from 'vitest';

import { detailsPlanOf, movesFocusToHeading } from './details-plan.util.ts';
import type { DetailsPlan } from '../common/graph-details.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection } from '../common/inspection.type.ts';

const pkg = (name: string): Inspection => {
  const inspection: Inspection = { kind: 'package', name };

  return inspection;
};

const link = (source: string, target: string): Inspection => {
  const inspection: Inspection = { kind: 'link', source, target };

  return inspection;
};

const pick = (start: string): Inspection => {
  const inspection: Inspection = { kind: 'picking', start, isNudged: false };

  return inspection;
};

const trace = (start: string, end: string): Inspection => {
  const inspection: Inspection = { kind: 'trace', start, end };

  return inspection;
};

const NUDGED: Inspection = { kind: 'picking', start: 'web', isNudged: true };

type PlanRow = {
  readonly title: string;
  readonly previous: Inspection | null;
  readonly next: Inspection;
  readonly isRebuild: boolean;
  readonly expected: DetailsPlan;
};

type FocusRow = {
  readonly plan: DetailsPlan;
  readonly hadFocus: boolean;
  readonly expected: boolean;
};

const PLAN_ROWS: PlanRow[] = [
  { title: 'nothing shown yet', previous: null, next: pkg('web'), isRebuild: false, expected: 'swap' },
  { title: 'the same package', previous: pkg('web'), next: pkg('web'), isRebuild: false, expected: 'update' },
  { title: 'the same package on a rebuild', previous: pkg('web'), next: pkg('web'), isRebuild: true, expected: 'rebuild' },
  { title: 'another package', previous: pkg('web'), next: pkg('ui'), isRebuild: false, expected: 'swap' },
  { title: 'a package then a link', previous: pkg('web'), next: link('web', 'ui'), isRebuild: false, expected: 'swap' },
  { title: 'the same link', previous: link('a', 'b'), next: link('a', 'b'), isRebuild: false, expected: 'update' },
  { title: 'the link the other way', previous: link('a', 'b'), next: link('b', 'a'), isRebuild: false, expected: 'swap' },
  { title: 'the same picking start', previous: pick('web'), next: pick('web'), isRebuild: false, expected: 'update' },
  { title: 'the same trace', previous: trace('s', 'e'), next: trace('s', 'e'), isRebuild: false, expected: 'update' },
  { title: 'a trace with swapped ends', previous: trace('s', 'e'), next: trace('e', 's'), isRebuild: false, expected: 'swap' },
  { title: 'picking that turns nudged', previous: pick('web'), next: NUDGED, isRebuild: false, expected: 'update' },
  { title: 'nothing again', previous: NO_INSPECTION, next: NO_INSPECTION, isRebuild: false, expected: 'update' },
  { title: 'nothing again on a rebuild', previous: NO_INSPECTION, next: NO_INSPECTION, isRebuild: true, expected: 'rebuild' },
  { title: 'the same __proto__ package', previous: pkg('__proto__'), next: pkg('__proto__'), isRebuild: false, expected: 'update' }
];

const FOCUS_ROWS: FocusRow[] = [
  { plan: 'swap', hadFocus: true, expected: true },
  { plan: 'rebuild', hadFocus: true, expected: true },
  { plan: 'swap', hadFocus: false, expected: false },
  { plan: 'rebuild', hadFocus: false, expected: false },
  { plan: 'update', hadFocus: true, expected: false }
];

describe('FEATURE: details plan', () => {
  describe('GIVEN the inspection shown and the next one', () => {
    it.each(PLAN_ROWS)('WHEN the next is $title THEN the plan is $expected', (row) => {
      const plan = detailsPlanOf(row.previous, row.next, row.isRebuild);

      expect(plan).toBe(row.expected);
    });
  });

  describe('GIVEN a plan and whether the panel held focus', () => {
    it.each(FOCUS_ROWS)('WHEN the plan is $plan with focus $hadFocus THEN the heading takes focus: $expected', (row) => {
      const moves = movesFocusToHeading(row.plan, row.hadFocus);

      expect(moves).toBe(row.expected);
    });
  });
});
