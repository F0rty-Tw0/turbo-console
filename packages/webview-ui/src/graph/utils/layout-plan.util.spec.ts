import { describe, expect, it } from 'vitest';

import { arrivalOf, fallbackNoticeOf, groupingOf, progressNoticeOf, switchPlanOf } from './layout-plan.util.ts';
import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { LayoutNotice } from '../common/graph-layouts.type.ts';
import type { FallbackCause } from '../common/layout.type.ts';

type ArrivalCase = {
  readonly resultHash: string;
  readonly drawnHash: string | null;
  readonly runMode: LayoutGrouping;
  readonly mode: LayoutGrouping;
  readonly expected: string;
};

type SwitchCase = [LayoutGrouping, LayoutGrouping, boolean, string];

type CauseCase = [FallbackCause | null, LayoutNotice];

type ProgressCase = [LayoutGrouping, string];

const ARRIVAL_CASES: ArrivalCase[] = [
  { resultHash: 'h1', drawnHash: 'h1', runMode: 'flat', mode: 'flat', expected: 'place' },
  { resultHash: 'h1', drawnHash: 'h1', runMode: 'folders', mode: 'flat', expected: 'store' },
  { resultHash: 'h1', drawnHash: 'h2', runMode: 'flat', mode: 'flat', expected: 'ignore' },
  { resultHash: 'h1', drawnHash: null, runMode: 'folders', mode: 'folders', expected: 'ignore' }
];

const SWITCH_CASES: SwitchCase[] = [
  ['flat', 'flat', true, 'keep'],
  ['folders', 'flat', true, 'place'],
  ['folders', 'flat', false, 'layOut'],
  ['flat', 'folders', false, 'layOut']
];

const CAUSE_CASES: CauseCase[] = [
  ['failure', { kind: 'fallback' }],
  ['oversize', { kind: 'oversize' }],
  [null, { kind: 'none' }]
];

const PROGRESS_CASES: ProgressCase[] = [
  ['folders', 'Laying out folders…'],
  ['flat', 'Laying out the graph…']
];

describe('FEATURE: layout plan', () => {
  describe.each(ARRIVAL_CASES)(
    'GIVEN a $resultHash result, the drawn hash $drawnHash, a $runMode run and the $mode mode',
    ({ resultHash, drawnHash, runMode, mode, expected }) => {
      it(`WHEN it arrives THEN the arrival is ${expected}`, () => {
        const arrival = arrivalOf(resultHash, drawnHash, runMode, mode);

        expect(arrival).toBe(expected);
      });
    }
  );

  describe.each(SWITCH_CASES)('GIVEN a switch to %j with %j on screen and a snapshot %j', (next, drawnMode, hasSnapshot, expected) => {
    it(`WHEN planned THEN the switch plan is ${JSON.stringify(expected)}`, () => {
      const plan = switchPlanOf(next, drawnMode, hasSnapshot);

      expect(plan).toBe(expected);
    });
  });

  describe.each(CAUSE_CASES)('GIVEN a layout on screen with the fallback cause %j', (fallbackCause, expected) => {
    it(`WHEN its notice is chosen THEN the notice is ${JSON.stringify(expected)}`, () => {
      const notice = fallbackNoticeOf(fallbackCause);

      expect(notice).toStrictEqual(expected);
    });
  });

  describe.each(PROGRESS_CASES)('GIVEN a switch to %j', (mode, text) => {
    it(`WHEN its progress is shown THEN the text is ${JSON.stringify(text)}`, () => {
      const notice = progressNoticeOf(mode);

      expect(notice).toStrictEqual({ kind: 'progress', text });
    });
  });

  describe.each<[boolean, LayoutGrouping]>([
    [true, 'folders'],
    [false, 'flat']
  ])('GIVEN the checkbox is %j', (isGrouped, mode) => {
    it(`WHEN its mode is asked THEN the grouping is ${JSON.stringify(mode)}`, () => {
      const grouping = groupingOf(isGrouped);

      expect(grouping).toBe(mode);
    });
  });
});
