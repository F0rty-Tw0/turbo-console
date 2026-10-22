import { describe, expect, it } from 'vitest';

import { focusInputOf, inputPlanOf, sameHashPlanOf, shouldPan } from './inspection-flow.util.ts';
import type { InputPlan, SameHashPlan } from '../common/graph-inspection.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, InspectionInput, LinkInspection, SelectVia } from '../common/inspection.type.ts';
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

const LINK_WEB_UI: LinkInspection = { kind: 'link', source: 'web', target: 'ui' };

const PROTO_LINK: LinkInspection = { kind: 'link', source: '__proto__', target: 'constructor' };

const planOf = (isUpdate: boolean, reask: LinkInspection | null): SameHashPlan => {
  const plan: SameHashPlan = { isUpdate, reask };

  return plan;
};

describe('FEATURE: focusInputOf', () => {
  describe('GIVEN a list Focus toggle', () => {
    it.each([
      { title: 'no inspection and a new focus', current: NO_INSPECTION, name: 'web', expected: sel('web', 'focus') },
      { title: 'a package and a new focus', current: pkg('web'), name: 'ui', expected: sel('ui', 'focus') },
      { title: 'a link and a new focus', current: link('a', 'b'), name: 'a', expected: sel('a', 'focus') },
      { title: 'a trace and a new focus', current: trace('s', 'e'), name: 'x', expected: sel('x', 'focus') },
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
      { title: 'a list Focus select of a package', input: sel('ui', 'focus'), next: pkg('ui'), expected: false },
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

const WEB = pkg('web');

const PICKING_WEB = pick('web', false);

const NUDGED_WEB = pick('web', true);

const LINK_AB = link('a', 'b');

const CLEAR: InspectionInput = { kind: 'clear' };

const CANVAS_ESCAPE: InspectionInput = { kind: 'escape', where: 'canvas' };

const planFor = (next: Inspection, centre: string | null, isKeepClear: boolean): InputPlan => {
  const plan: InputPlan = { next, centre, isKeepClear };

  return plan;
};

type InputPlanRow = {
  readonly title: string;
  readonly current: Inspection;
  readonly input: InspectionInput;
  readonly expected: InputPlan;
};

describe('FEATURE: inputPlanOf', () => {
  describe('GIVEN the inspection and an input', () => {
    it.each([
      { title: 'a list select of another package', current: WEB, input: sel('ui', 'list'), expected: planFor(pkg('ui'), 'ui', true) },
      {
        title: 'a canvas tap on the inspected package',
        current: WEB,
        input: sel('web', 'canvas'),
        expected: planFor(WEB, null, true)
      },
      { title: 'an Escape in the panel on a package', current: WEB, input: PANEL_ESCAPE, expected: planFor(WEB, null, false) },
      {
        title: 'a list select of the start while picking',
        current: PICKING_WEB,
        input: sel('web', 'list'),
        expected: planFor(PICKING_WEB, null, false)
      },
      { title: 'a link tap while nudged', current: NUDGED_WEB, input: TAP_AB, expected: planFor(NUDGED_WEB, null, false) },
      {
        title: 'a Clear selection with nothing inspected',
        current: NO_INSPECTION,
        input: CLEAR,
        expected: planFor(NO_INSPECTION, null, false)
      },
      {
        title: 'an Escape on the canvas on a link',
        current: LINK_AB,
        input: CANVAS_ESCAPE,
        expected: planFor(NO_INSPECTION, null, true)
      }
    ] satisfies InputPlanRow[])('WHEN $title THEN the plan is exact', ({ current, input, expected }) => {
      const plan = inputPlanOf(current, input);

      expect(plan).toStrictEqual(expected);
    });
  });
});

describe('FEATURE: sameHashPlanOf', () => {
  describe('GIVEN a same-hash state', () => {
    it.each([
      { title: 'no inspection with changed counts', current: NO_INSPECTION, isChanged: true, expected: planOf(false, null) },
      { title: 'a link with unchanged counts', current: LINK_WEB_UI, isChanged: false, expected: planOf(false, LINK_WEB_UI) },
      { title: 'a link with changed counts', current: LINK_WEB_UI, isChanged: true, expected: planOf(false, LINK_WEB_UI) },
      { title: 'a package with changed counts', current: pkg('web'), isChanged: true, expected: planOf(true, null) },
      { title: 'a package with unchanged counts', current: pkg('web'), isChanged: false, expected: planOf(false, null) },
      { title: 'a trace with changed counts', current: trace('s', 'e'), isChanged: true, expected: planOf(false, null) },
      { title: 'picking with changed counts', current: pick('s', false), isChanged: true, expected: planOf(false, null) }
    ])('WHEN $title THEN the plan is exact', ({ current, isChanged, expected }) => {
      const plan = sameHashPlanOf(current, isChanged);

      expect(plan).toStrictEqual(expected);
    });

    it('WHEN a __proto__ link shows THEN the link is asked again', () => {
      const plan = sameHashPlanOf(PROTO_LINK, false);

      expect(plan.reask).toBe(PROTO_LINK);
    });
  });
});
