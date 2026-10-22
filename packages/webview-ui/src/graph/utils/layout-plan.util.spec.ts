import { describe, expect, it } from 'vitest';

import { arrivalOf, engineNoticeOf, groupingOf, progressNoticeOf, switchPlanOf } from './layout-plan.util.ts';
import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { LayoutNotice } from '../common/graph-layouts.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';

type ArrivalCase = {
  readonly resultHash: string;
  readonly drawnHash: string | null;
  readonly runMode: LayoutGrouping;
  readonly mode: LayoutGrouping;
  readonly expected: string;
};

type SwitchCase = [LayoutGrouping, LayoutGrouping, boolean, string];

type EngineCase = [LayoutEngine | null, LayoutNotice];

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

const ENGINE_CASES: EngineCase[] = [
  ['fallback', { kind: 'fallback' }],
  ['elk', { kind: 'none' }],
  ['cache', { kind: 'none' }],
  [null, { kind: 'none' }]
];

const PROGRESS_CASES: ProgressCase[] = [
  ['folders', 'Laying out folders…'],
  ['flat', 'Laying out the graph…']
];

describe('FEATURE: arrivalOf', () => {
  it.each(ARRIVAL_CASES)(
    'GIVEN a $resultHash result, the drawn hash $drawnHash, a $runMode run and the $mode mode WHEN it arrives THEN it is $expected',
    ({ resultHash, drawnHash, runMode, mode, expected }) => {
      const arrival = arrivalOf(resultHash, drawnHash, runMode, mode);

      expect(arrival).toBe(expected);
    }
  );
});

describe('FEATURE: switchPlanOf', () => {
  it.each(SWITCH_CASES)(
    'GIVEN a switch to %j with %j on screen and a snapshot %j WHEN planned THEN it is %j',
    (next, drawnMode, hasSnapshot, expected) => {
      const plan = switchPlanOf(next, drawnMode, hasSnapshot);

      expect(plan).toBe(expected);
    }
  );
});

describe('FEATURE: engineNoticeOf', () => {
  it.each(ENGINE_CASES)('GIVEN the engine %j on screen WHEN its notice is chosen THEN it is %j', (engine, expected) => {
    const notice = engineNoticeOf(engine);

    expect(notice).toStrictEqual(expected);
  });
});

describe('FEATURE: progressNoticeOf', () => {
  it.each(PROGRESS_CASES)('GIVEN a switch to %j WHEN its progress is shown THEN the text is %j', (mode, text) => {
    const notice = progressNoticeOf(mode);

    expect(notice).toStrictEqual({ kind: 'progress', text });
  });
});

describe('FEATURE: groupingOf', () => {
  it.each<[boolean, LayoutGrouping]>([
    [true, 'folders'],
    [false, 'flat']
  ])('GIVEN the checkbox is %j WHEN its mode is asked THEN it is %j', (isGrouped, mode) => {
    const grouping = groupingOf(isGrouped);

    expect(grouping).toBe(mode);
  });
});
