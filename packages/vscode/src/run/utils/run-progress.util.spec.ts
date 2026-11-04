import type { TaskOutcome } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { eventRunOf } from './run-progress-event.util.ts';
import { progressRunOf } from './run-progress.util.ts';
import type { ProgressEventInput, ProgressRun, ProgressSettleInput, ProgressState } from '../common/run-progress.type.ts';
import type { RunEntry, RunState } from '../common/run.type.ts';
import { SEEN_UI } from '../test/common/run-progress.const.ts';
import { RUN_ENTRY_STUB } from '../test/stubs/run.stub.ts';
import { progressRunWith, recordOf, uiRunOf } from '../test/utils/run-progress.spec.util.ts';

const TOKENS_PASSED: TaskOutcome = { taskId: 'tokens#build', state: 'passed' };

const TOKENS_FAILED: TaskOutcome = { taskId: 'tokens#build', state: 'failed' };

const endedOf = (state: RunState, outcomes: TaskOutcome[] | null): RunEntry => {
  const exitCode = state === 'passed' ? 0 : 1;
  const ended: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'web#build', state, endedAt: 4000, exitCode, outcomes };

  return ended;
};

const settledOf = (run: ProgressRun, entry: RunEntry): ProgressRun => {
  const input: ProgressSettleInput = { kind: 'settle', entry };

  return progressRunOf(run, input);
};

describe('FEATURE: progress of one run, settle at the run end (spec §5.1, D7, B2-1)', () => {
  describe('GIVEN a summary outcome for ui#build', () => {
    it.each<[TaskOutcome['state'], ProgressState | null]>([
      ['passed', null],
      ['passed', 'running'],
      ['passed', 'passed'],
      ['passed', 'failed'],
      ['passed', 'stopped'],
      ['failed', null],
      ['failed', 'running'],
      ['failed', 'passed'],
      ['failed', 'failed'],
      ['failed', 'stopped']
    ])('WHEN the summary says %s over a %s record THEN ui#build takes that state stamped 4000', (outcome, state) => {
      const run = uiRunOf(state);
      const ui: TaskOutcome = { taskId: 'ui#build', state: outcome };
      const entry = endedOf(outcome, [ui]);

      const expected = recordOf('ui#build', outcome, 4000);

      const next = settledOf(run, entry);

      expect(next.records.get('ui#build')).toStrictEqual(expected);
    });
  });

  describe('GIVEN a running ui#build the summary does not list', () => {
    it.each<[RunState, TaskOutcome[] | null, ProgressState]>([
      ['passed', [TOKENS_PASSED], 'passed'],
      ['failed', [TOKENS_FAILED], 'stopped'],
      ['failed', [], 'stopped'],
      ['stopped', [TOKENS_PASSED], 'stopped'],
      ['passed', null, 'passed'],
      ['stopped', null, 'stopped']
    ])('WHEN a %s run with outcomes %j settles THEN ui#build is %s stamped 4000', (state, outcomes, expectedState) => {
      const run = uiRunOf('running');
      const entry = endedOf(state, outcomes);

      const expected = recordOf('ui#build', expectedState, 4000);

      const next = settledOf(run, entry);

      expect(next.records.get('ui#build')).toStrictEqual(expected);
    });

    it.each<[RunState]>([['failed'], ['failed-to-start']])(
      'WHEN a %s run with no outcomes settles THEN ui#build is removed',
      (state) => {
        const run = uiRunOf('running');
        const entry = endedOf(state, null);

        const next = settledOf(run, entry);

        expect(next.records.has('ui#build')).toBe(false);
      }
    );
  });

  describe('GIVEN a settled-state ui#build stamped 1500 and no outcome for it', () => {
    it.each<[RunState, TaskOutcome[] | null, ProgressState]>([
      ['failed', [TOKENS_FAILED], 'passed'],
      ['failed', [TOKENS_FAILED], 'failed'],
      ['failed', [TOKENS_FAILED], 'stopped'],
      ['passed', null, 'passed'],
      ['passed', null, 'failed'],
      ['passed', null, 'stopped'],
      ['failed', null, 'passed'],
      ['failed', null, 'failed'],
      ['failed', null, 'stopped'],
      ['stopped', null, 'passed'],
      ['stopped', null, 'failed'],
      ['stopped', null, 'stopped']
    ])('WHEN a %s run with outcomes %j settles THEN the %s record is kept at 1500', (entryState, outcomes, state) => {
      const run = uiRunOf(state);
      const entry = endedOf(entryState, outcomes);

      const expected = recordOf('ui#build', state, 1500);

      const next = settledOf(run, entry);

      expect(next.records.get('ui#build')).toStrictEqual(expected);
    });
  });

  describe('GIVEN a summary that lists the owner web#build itself', () => {
    it('WHEN the run settles THEN the run holds no record of web#build', () => {
      const run = progressRunWith([]);
      const web: TaskOutcome = { taskId: 'web#build', state: 'passed' };
      const entry = endedOf('passed', [web]);

      const next = settledOf(run, entry);

      expect(next.records.has('web#build')).toBe(false);
    });
  });

  describe('GIVEN an exit-0 summary that lists tokens#build passed but not the owner', () => {
    it('WHEN the run settles THEN tokens#build is passed and the running ui#build is passed, not stopped', () => {
      const run = uiRunOf('running');
      const entry = endedOf('passed', [TOKENS_PASSED]);

      const tokens = recordOf('tokens#build', 'passed', 4000);
      const ui = recordOf('ui#build', 'passed', 4000);
      const expected = new Map([
        ['ui#build', ui],
        ['tokens#build', tokens]
      ]);

      const next = settledOf(run, entry);

      expect(next.records).toStrictEqual(expected);
    });
  });

  describe('GIVEN the owner entry is still running (endedAt null)', () => {
    it('WHEN a settle arrives THEN the same run object comes back, unsettled', () => {
      const run = uiRunOf('running');
      const entry: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'web#build' };

      const next = settledOf(run, entry);

      expect(next).toBe(run);
    });
  });

  describe('GIVEN a run with no record and no outcomes', () => {
    it('WHEN it settles THEN it is settled with no record', () => {
      const run = progressRunWith([]);
      const entry = endedOf('passed', null);

      const records = new Map();
      const expected = { records, settled: true };

      const next = settledOf(run, entry);

      expect(next).toMatchObject(expected);
    });
  });

  describe('GIVEN an event input', () => {
    it('WHEN progressRunOf gets it THEN it gives what eventRunOf gives', () => {
      const tokens = recordOf('tokens#build', 'running', 1500);
      const run = progressRunWith([tokens]);
      const input: ProgressEventInput = { kind: 'event', event: SEEN_UI, at: 2000 };

      const expected = eventRunOf(run, SEEN_UI, 2000);

      const next = progressRunOf(run, input);

      expect(next).toStrictEqual(expected);
    });
  });
});
