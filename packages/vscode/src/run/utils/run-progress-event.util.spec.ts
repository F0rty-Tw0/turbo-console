import type { RunLogEvent } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { eventRunOf } from './run-progress-event.util.ts';
import type { ProgressRecord, ProgressRun, ProgressState } from '../common/run-progress.type.ts';
import { progressRunWith, recordOf } from '../test/utils/run-progress.spec.util.ts';

const SEEN_UI: RunLogEvent = { kind: 'seen', taskId: 'ui#build' };

const HIT_UI: RunLogEvent = { kind: 'cacheHit', taskId: 'ui#build' };

const SEEN_WEB: RunLogEvent = { kind: 'seen', taskId: 'web#build' };

const SEEN_LINT: RunLogEvent = { kind: 'seen', taskId: 'app#lint' };

const eventOf = (kind: RunLogEvent['kind']): RunLogEvent => {
  const event = kind === 'seen' ? SEEN_UI : HIT_UI;

  return event;
};

const runOf = (state: ProgressState | null): ProgressRun => {
  if (state === null) return progressRunWith([]);

  const record = recordOf('ui#build', state, 1500);

  return progressRunWith([record]);
};

describe('FEATURE: progress of one run, log events (spec §5.1)', () => {
  describe('GIVEN each record state of ui#build (it.each over the event cells)', () => {
    it.each<[string, RunLogEvent['kind'], ProgressState | null, ProgressState]>([
      ['no record', 'seen', null, 'running'],
      ['running', 'seen', 'running', 'running'],
      ['passed (a late line)', 'seen', 'passed', 'passed'],
      ['failed', 'seen', 'failed', 'failed'],
      ['stopped', 'seen', 'stopped', 'stopped'],
      ['no record', 'cacheHit', null, 'passed'],
      ['running', 'cacheHit', 'running', 'passed'],
      ['passed', 'cacheHit', 'passed', 'passed'],
      ['failed', 'cacheHit', 'failed', 'failed'],
      ['stopped', 'cacheHit', 'stopped', 'stopped']
    ])('WHEN a %s task gets a %s line THEN it is %s', (_name, kind, state, expected) => {
      const run = runOf(state);
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
      (state, expected, at) => {
        const tokens = recordOf('tokens#build', state, 1500);
        const run = progressRunWith([tokens]);

        const next = eventRunOf(run, SEEN_UI, 2000);

        expect(next.records.get('tokens#build')).toStrictEqual(recordOf('tokens#build', expected, at));
      }
    );

    it('WHEN ui#build prints while tokens#build has no record THEN tokens#build still has none', () => {
      const run = progressRunWith([]);

      const next = eventRunOf(run, SEEN_UI, 2000);

      expect(next.records.has('tokens#build')).toBe(false);
    });

    it('WHEN the owner web#build prints its own first line THEN its running dependency ui#build is passed', () => {
      const ui = recordOf('ui#build', 'running', 1500);
      const run = progressRunWith([ui]);

      const next = eventRunOf(run, SEEN_WEB, 2000);

      expect(next.records.get('ui#build')).toStrictEqual(recordOf('ui#build', 'passed', 2000));
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

    it('WHEN another line of it arrives THEN the same run object comes back (no change)', () => {
      const run = progressRunWith([ui]);

      const next = eventRunOf(run, SEEN_UI, 2000);

      expect(next).toBe(run);
    });

    it('WHEN its cache hit arrives at 2000 THEN the record is stamped 2000 and the run is still unsettled', () => {
      const run = progressRunWith([ui]);

      const passed = recordOf('ui#build', 'passed', 2000);
      const records = new Map([['ui#build', passed]]);
      const expected = { records, settled: false };

      const next = eventRunOf(run, HIT_UI, 2000);

      expect(next).toMatchObject(expected);
    });
  });
});
