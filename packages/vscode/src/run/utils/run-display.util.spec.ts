import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { displayRunOf } from './run-display.util.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { DisplayedRun, ProgressOwner, ProgressRecord } from '../common/run-progress.type.ts';
import type { RunEntry } from '../common/run.type.ts';
import { RUN_ENTRY_STUB } from '../test/stubs/run.stub.ts';
import { recordOf } from '../test/utils/run-progress.spec.util.ts';

type DisplayRow = {
  readonly given: string;
  readonly own: RunEntry | undefined;
  readonly records: ProgressRecord[];
  readonly expected: DisplayedRun;
};

type OrderRow = {
  readonly order: string;
  readonly records: ProgressRecord[];
};

const A: ProgressOwner = { root: '/ws', taskId: 'a#build', launchedAt: 1000 };

const B: ProgressOwner = { root: '/ws', taskId: 'b#build', launchedAt: 1100 };

const RUNNING_IN_A = recordOf('ui#build', 'running', 1000, A);

const RUNNING_IN_B = recordOf('ui#build', 'running', 1100, B);

const PASSED_IN_B_AT_1300 = recordOf('ui#build', 'passed', 1300, B);

const FAILED_IN_A_AT_1300 = recordOf('ui#build', 'failed', 1300, A);

const FAILED_IN_A_AT_1500 = recordOf('ui#build', 'failed', 1500, A);

const OWN_RUNNING: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'ui#build', state: 'running', launchedAt: 1000 };

const OWN_PASSED_AT_1500: RunEntry = { ...OWN_RUNNING, state: 'passed', endedAt: 1500, exitCode: 0 };

const OWN_PASSED_AT_1100: RunEntry = { ...OWN_RUNNING, state: 'passed', endedAt: 1100, exitCode: 0 };

const OWN_PASSED_AT_1300: RunEntry = { ...OWN_RUNNING, state: 'passed', endedAt: 1300, exitCode: 0 };

const OWN_STOPPED_UNENDED_LAUNCHED_1500: RunEntry = { ...OWN_RUNNING, state: 'stopped', launchedAt: 1500 };

const OWN_FAILED_TO_START: RunEntry = { ...OWN_RUNNING, state: 'failed-to-start', endedAt: 1100 };

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

const OWN_SCRIPT_RUNNING: RunEntry = { ...OWN_RUNNING, task: SCRIPT_TASK };

const RUNNING_OWNED_BY_A: DisplayedRun = { state: 'running', owner: 'a#build' };

const RUNNING_OWNED_BY_B: DisplayedRun = { state: 'running', owner: 'b#build' };

const RUNNING_UNOWNED: DisplayedRun = { state: 'running', owner: null };

const PASSED_UNOWNED: DisplayedRun = { state: 'passed', owner: null };

const FAILED_UNOWNED: DisplayedRun = { state: 'failed', owner: null };

const STOPPED_UNOWNED: DisplayedRun = { state: 'stopped', owner: null };

const FAILED_TO_START_UNOWNED: DisplayedRun = { state: 'failed-to-start', owner: null };

const DISPLAY_ROWS: DisplayRow[] = [
  { given: 'no own entry, one running record of A', own: undefined, records: [RUNNING_IN_A], expected: RUNNING_OWNED_BY_A },
  {
    given: 'no own entry, running in A, passed in B',
    own: undefined,
    records: [RUNNING_IN_A, PASSED_IN_B_AT_1300],
    expected: RUNNING_OWNED_BY_A
  },
  {
    given: 'no own entry, running in A and newer B',
    own: undefined,
    records: [RUNNING_IN_A, RUNNING_IN_B],
    expected: RUNNING_OWNED_BY_B
  },
  { given: 'own running, running in A', own: OWN_RUNNING, records: [RUNNING_IN_A], expected: RUNNING_UNOWNED },
  {
    given: 'own running, running in newer B',
    own: OWN_RUNNING,
    records: [RUNNING_IN_B],
    expected: RUNNING_UNOWNED
  },
  { given: 'own passed at 1500, running in A', own: OWN_PASSED_AT_1500, records: [RUNNING_IN_A], expected: RUNNING_OWNED_BY_A },
  {
    given: 'own passed at 1500, failed in A at 1300',
    own: OWN_PASSED_AT_1500,
    records: [FAILED_IN_A_AT_1300],
    expected: PASSED_UNOWNED
  },
  {
    given: 'own passed at 1100, failed in A at 1300',
    own: OWN_PASSED_AT_1100,
    records: [FAILED_IN_A_AT_1300],
    expected: FAILED_UNOWNED
  },
  {
    given: 'unended own stopped at 1500, A at 1300',
    own: OWN_STOPPED_UNENDED_LAUNCHED_1500,
    records: [FAILED_IN_A_AT_1300],
    expected: STOPPED_UNOWNED
  },
  { given: 'own failed-to-start, no record', own: OWN_FAILED_TO_START, records: [], expected: FAILED_TO_START_UNOWNED }
];

const TIE_ROWS: OrderRow[] = [
  { order: 'A first', records: [FAILED_IN_A_AT_1300, PASSED_IN_B_AT_1300] },
  { order: 'B first', records: [PASSED_IN_B_AT_1300, FAILED_IN_A_AT_1300] }
];

const LATER_ROWS: OrderRow[] = [
  { order: 'A first', records: [FAILED_IN_A_AT_1500, PASSED_IN_B_AT_1300] },
  { order: 'B first', records: [PASSED_IN_B_AT_1300, FAILED_IN_A_AT_1500] }
];

describe('FEATURE: shown run state of one task id (spec §5.2, D9)', () => {
  describe('GIVEN the own entry of the id, if any, and the records other runs hold for it', () => {
    it.each<DisplayRow>(DISPLAY_ROWS)(
      'WHEN the task has $given THEN it shows $expected.state, owner $expected.owner',
      ({ own, records, expected }) => {
        const shown = displayRunOf(own, records);

        expect(shown).toStrictEqual(expected);
      }
    );
  });

  describe('GIVEN no own entry and no record', () => {
    it('WHEN the id is shown THEN it shows nothing', () => {
      const shown = displayRunOf(undefined, []);

      expect(shown).toBeNull();
    });
  });

  describe('GIVEN an own entry and a record that end at the same ms', () => {
    it('WHEN the id is shown THEN the own entry wins the tie', () => {
      const expected: DisplayedRun = PASSED_UNOWNED;

      const shown = displayRunOf(OWN_PASSED_AT_1300, [FAILED_IN_A_AT_1300]);

      expect(shown).toStrictEqual(expected);
    });
  });

  describe('GIVEN records of A and B that end at the same ms and no own entry', () => {
    it.each<OrderRow>(TIE_ROWS)('WHEN they are listed $order THEN the record of the newer owner run B wins', ({ records }) => {
      const expected: DisplayedRun = PASSED_UNOWNED;

      const shown = displayRunOf(undefined, records);

      expect(shown).toStrictEqual(expected);
    });
  });

  describe('GIVEN a passed record of B at 1300, a failed record of A at 1500 and no own entry', () => {
    it.each<OrderRow>(LATER_ROWS)('WHEN they are listed $order THEN the later record of A wins', ({ records }) => {
      const expected: DisplayedRun = FAILED_UNOWNED;

      const shown = displayRunOf(undefined, records);

      expect(shown).toStrictEqual(expected);
    });
  });

  describe('GIVEN a running script run (Run Without Turbo) as the own entry', () => {
    it('WHEN another run also runs the id THEN it is running with no owner', () => {
      const expected: DisplayedRun = RUNNING_UNOWNED;

      const shown = displayRunOf(OWN_SCRIPT_RUNNING, [RUNNING_IN_B]);

      expect(shown).toStrictEqual(expected);
    });
  });
});
