import { describe, expect, it } from 'vitest';

import { detailsPlanOf } from './details-plan.util.ts';
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

const folder = (key: string): Inspection => {
  const inspection: Inspection = { kind: 'folder', folder: key };

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
  { title: 'the same folder', previous: folder('apps'), next: folder('apps'), isRebuild: false, expected: 'update' },
  { title: 'the same folder on a rebuild', previous: folder('apps'), next: folder('apps'), isRebuild: true, expected: 'rebuild' },
  { title: 'a folder then another', previous: folder('apps'), next: folder('packages'), isRebuild: false, expected: 'swap' },
  { title: 'nothing then a folder', previous: NO_INSPECTION, next: folder('apps'), isRebuild: false, expected: 'swap' },
  {
    title: 'the root folder then a folder named (root)',
    previous: folder(''),
    next: folder('(root)'),
    isRebuild: false,
    expected: 'swap'
  },
  { title: 'the same __proto__ package', previous: pkg('__proto__'), next: pkg('__proto__'), isRebuild: false, expected: 'update' }
];

describe('FEATURE: details plan', () => {
  describe('GIVEN the inspection shown and the next one', () => {
    it.each(PLAN_ROWS)('WHEN the next is $title THEN the plan is $expected', (row) => {
      const plan = detailsPlanOf(row.previous, row.next, row.isRebuild);

      expect(plan).toBe(row.expected);
    });
  });
});
