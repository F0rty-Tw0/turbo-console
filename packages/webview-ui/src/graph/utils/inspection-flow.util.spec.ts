import { describe, expect, it } from 'vitest';

import { focusInputOf, sameHashPlanOf, shouldPan } from './inspection-flow.util.ts';
import type { SameHashPlan } from '../common/graph-inspection.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, InspectionInput, SelectVia } from '../common/inspection.type.ts';
import { link, pick, pkg, trace } from '../test/utils/inspections.spec.util.ts';

const sel = (name: string, via: SelectVia): InspectionInput => {
  const input: InspectionInput = { kind: 'select', name, via };

  return input;
};

type PanRow = {
  readonly title: string;
  readonly input: InspectionInput;
  readonly next: Inspection;
  readonly expected: boolean;
};

const PICK_UI: InspectionInput = { kind: 'pick', name: 'ui' };

const TAP_AB: InspectionInput = { kind: 'tapLink', source: 'a', target: 'b' };

const EXPLAIN_AB: InspectionInput = { kind: 'explain', source: 'a', target: 'b' };

const SWAP_ENDS: InspectionInput = { kind: 'swapEnds' };

const CANCEL: InspectionInput = { kind: 'cancel' };

const CLEAR_TRACE: InspectionInput = { kind: 'clearTrace' };

const PANEL_ESCAPE: InspectionInput = { kind: 'escape', where: 'panel' };

const planOf = (isUpdate: boolean, isReask: boolean): SameHashPlan => {
  const plan: SameHashPlan = { isUpdate, isReask };

  return plan;
};

describe('FEATURE: focusInputOf', () => {
  describe('GIVEN a list Focus toggle', () => {
    it.each([
      { title: 'no inspection and a new focus', current: NO_INSPECTION, name: 'web', expected: sel('web', 'canvas') },
      { title: 'a package and a new focus', current: pkg('web'), name: 'ui', expected: sel('ui', 'canvas') },
      { title: 'a link and a new focus', current: link('a', 'b'), name: 'a', expected: sel('a', 'canvas') },
      { title: 'a trace and a new focus', current: trace('s', 'e'), name: 'x', expected: sel('x', 'canvas') },
      { title: 'picking and a new focus', current: pick('web', false), name: 'ui', expected: null },
      { title: 'a package and a cleared focus', current: pkg('web'), name: null, expected: null },
      { title: 'picking and a cleared focus', current: pick('web', false), name: null, expected: null }
    ])('WHEN $title THEN the input is exact', ({ current, name, expected }) => {
      const input = focusInputOf(current, name);

      expect(input).toStrictEqual(expected);
    });
  });
});

describe('FEATURE: shouldPan', () => {
  describe('GIVEN an input and the inspection it led to', () => {
    it.each([
      { title: 'a list select of a package', input: sel('ui', 'list'), next: pkg('ui'), expected: true },
      { title: 'a search select of a package', input: sel('ui', 'search'), next: pkg('ui'), expected: true },
      { title: 'a panel select of a package', input: sel('ui', 'panel'), next: pkg('ui'), expected: true },
      { title: 'a canvas select of a package', input: sel('ui', 'canvas'), next: pkg('ui'), expected: false },
      { title: 'a list select that ends a trace', input: sel('ui', 'list'), next: trace('web', 'ui'), expected: false },
      { title: 'a list select while picking', input: sel('web', 'list'), next: pick('web', false), expected: false },
      { title: 'a candidate pick', input: PICK_UI, next: trace('web', 'ui'), expected: false },
      {
        title: 'a link tap',
        input: TAP_AB,
        next: link('a', 'b'),
        expected: false
      },
      {
        title: 'an explain',
        input: EXPLAIN_AB,
        next: link('a', 'b'),
        expected: false
      },
      { title: 'a swap of ends', input: SWAP_ENDS, next: trace('ui', 'web'), expected: false },
      { title: 'a cancel', input: CANCEL, next: pkg('web'), expected: false },
      { title: 'a clear of the trace', input: CLEAR_TRACE, next: pkg('web'), expected: false },
      { title: 'an Escape in the panel', input: PANEL_ESCAPE, next: pkg('web'), expected: false }
    ] satisfies PanRow[])('WHEN $title THEN the answer is $expected', ({ input, next, expected }) => {
      const isPan = shouldPan(input, next);

      expect(isPan).toBe(expected);
    });
  });
});

describe('FEATURE: sameHashPlanOf', () => {
  describe('GIVEN a same-hash state', () => {
    it.each([
      { title: 'no inspection with changed counts', current: NO_INSPECTION, isChanged: true, expected: planOf(false, false) },
      { title: 'a link with unchanged counts', current: link('web', 'ui'), isChanged: false, expected: planOf(false, true) },
      { title: 'a link with changed counts', current: link('web', 'ui'), isChanged: true, expected: planOf(false, true) },
      { title: 'a package with changed counts', current: pkg('web'), isChanged: true, expected: planOf(true, false) },
      { title: 'a package with unchanged counts', current: pkg('web'), isChanged: false, expected: planOf(false, false) },
      { title: 'a trace with changed counts', current: trace('s', 'e'), isChanged: true, expected: planOf(false, false) },
      { title: 'picking with changed counts', current: pick('s', false), isChanged: true, expected: planOf(false, false) }
    ])('WHEN $title THEN the plan is exact', ({ current, isChanged, expected }) => {
      const plan = sameHashPlanOf(current, isChanged);

      expect(plan).toStrictEqual(expected);
    });

    it('WHEN a __proto__ link shows THEN the link is asked again', () => {
      const current = link('__proto__', 'constructor');

      const plan = sameHashPlanOf(current, false);

      expect(plan.isReask).toBe(true);
    });
  });
});
