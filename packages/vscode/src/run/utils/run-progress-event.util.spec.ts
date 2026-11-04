import type { RunLogEvent } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { eventRunOf } from './run-progress-event.util.ts';
import type { ProgressRecord, ProgressState } from '../common/run-progress.type.ts';
import { SEEN_UI } from '../test/common/run-progress.const.ts';
import { progressRunWith, recordOf, uiRunOf } from '../test/utils/run-progress.spec.util.ts';

type EventCell = {
  readonly record: string;
  readonly kind: RunLogEvent['kind'];
  readonly state: ProgressState | null;
  readonly expected: ProgressState;
};

const HIT_UI: RunLogEvent = { kind: 'cacheHit', taskId: 'ui#build' };

const SEEN_WEB: RunLogEvent = { kind: 'seen', taskId: 'web#build' };

const SEEN_LINT: RunLogEvent = { kind: 'seen', taskId: 'app#lint' };

const eventOf = (kind: RunLogEvent['kind']): RunLogEvent => {
  const event = kind === 'seen' ? SEEN_UI : HIT_UI;

  return event;
};

describe('FEATURE: progress of one run, log events (spec §5.1)', () => {
  describe('GIVEN each record state of ui#build', () => {
    it.each<EventCell>([
      { record: 'no record', kind: 'seen', state: null, expected: 'running' },
      { record: 'running', kind: 'seen', state: 'running', expected: 'running' },
      { record: 'passed (a late line)', kind: 'seen', state: 'passed', expected: 'passed' },
      { record: 'failed', kind: 'seen', state: 'failed', expected: 'failed' },
      { record: 'stopped', kind: 'seen', state: 'stopped', expected: 'stopped' },
      { record: 'no record', kind: 'cacheHit', state: null, expected: 'passed' },
      { record: 'running', kind: 'cacheHit', state: 'running', expected: 'passed' },
      { record: 'passed', kind: 'cacheHit', state: 'passed', expected: 'passed' },
      { record: 'failed', kind: 'cacheHit', state: 'failed', expected: 'failed' },
      { record: 'stopped', kind: 'cacheHit', state: 'stopped', expected: 'stopped' }
    ])('WHEN a $record task gets a $kind line THEN it is $expected', ({ kind, state, expected }) => {
      const run = uiRunOf(state);
      const event = eventOf(kind);

      const next = eventRunOf(run, event, 2000);

      expect(next.records.get('ui#build')?.state).toBe(expected);
    });
  });

  describe('GIVEN ui#build depends on tokens#build (D3 inference)', () => {
    it.each<[ProgressState, ProgressState, number]>([
      ['running', 'passed', 2000],
      ['passed', 'passed', 1500],
      ['failed', 'failed', 1500],
      ['stopped', 'stopped', 1500]
    ])(
      'WHEN ui#build prints its first line while tokens#build (stamped 1500) is %s THEN the record is %s stamped %d',
      (state, expectedState, at) => {
        const tokens = recordOf('tokens#build', state, 1500);
        const run = progressRunWith([tokens]);

        const expected = recordOf('tokens#build', expectedState, at);

        const next = eventRunOf(run, SEEN_UI, 2000);

        expect(next.records.get('tokens#build')).toStrictEqual(expected);
      }
    );

    it('WHEN ui#build gets a cache hit while tokens#build is running THEN tokens#build is passed stamped 2000', () => {
      const tokens = recordOf('tokens#build', 'running', 1500);
      const run = progressRunWith([tokens]);

      const expected = recordOf('tokens#build', 'passed', 2000);

      const next = eventRunOf(run, HIT_UI, 2000);

      expect(next.records.get('tokens#build')).toStrictEqual(expected);
    });

    it('WHEN ui#build prints while tokens#build has no record THEN tokens#build still has none', () => {
      const run = progressRunWith([]);

      const next = eventRunOf(run, SEEN_UI, 2000);

      expect(next.records.has('tokens#build')).toBe(false);
    });

    it('WHEN the owner web#build prints its own first line THEN its running dependency ui#build is passed', () => {
      const ui = recordOf('ui#build', 'running', 1500);
      const run = progressRunWith([ui]);

      const expected = recordOf('ui#build', 'passed', 2000);

      const next = eventRunOf(run, SEEN_WEB, 2000);

      expect(next.records.get('ui#build')).toStrictEqual(expected);
    });

    it('WHEN a task with no dependencies in the snapshot prints THEN no other record changes', () => {
      const ui = recordOf('ui#build', 'running', 1500);
      const run = progressRunWith([ui]);

      const next = eventRunOf(run, SEEN_LINT, 2000);

      expect(next.records.get('ui#build')).toBe(ui);
    });
  });

  describe('GIVEN the owner web#build', () => {
    it('WHEN it prints its own line THEN the run holds no record of web#build', () => {
      const run = progressRunWith([]);

      const next = eventRunOf(run, SEEN_WEB, 2000);

      expect(next.records.has('web#build')).toBe(false);
    });
  });

  describe('GIVEN a running ui#build stamped 1500', () => {
    const ui: ProgressRecord = recordOf('ui#build', 'running', 1500);

    it('WHEN another line of it arrives THEN the same run object comes back', () => {
      const run = progressRunWith([ui]);

      const next = eventRunOf(run, SEEN_UI, 2000);

      expect(next).toBe(run);
    });

    it('WHEN its cache hit arrives at 2000 THEN the record is passed stamped 2000', () => {
      const run = progressRunWith([ui]);

      const expected = recordOf('ui#build', 'passed', 2000);

      const next = eventRunOf(run, HIT_UI, 2000);

      expect(next.records.get('ui#build')).toStrictEqual(expected);
    });

    it('WHEN its cache hit arrives on an unsettled run THEN the run is still unsettled', () => {
      const run = progressRunWith([ui]);

      const next = eventRunOf(run, HIT_UI, 2000);

      expect(next.settled).toBe(false);
    });

    it('WHEN its cache hit arrives on a settled run THEN the run is still settled', () => {
      const run = progressRunWith([ui], true);

      const next = eventRunOf(run, HIT_UI, 2000);

      expect(next.settled).toBe(true);
    });
  });
});
