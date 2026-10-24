import { describe, expect, it } from 'vitest';

import { atomResultOf } from './atom-result.util.ts';
import type { RunSummaryTask } from '../../shared/turbo/common/turbo.type.ts';

const EXECUTION = { startTime: 1000, endTime: 1500, exitCode: 0 };

const MISS = { status: 'MISS' } as const;

const HIT = { status: 'HIT' } as const;

const MISS_ENTRY: RunSummaryTask = { taskId: 'pkg#file', execution: EXECUTION, cache: MISS };

const entryWith = (status: 'HIT' | 'MISS', execution: Partial<RunSummaryTask['execution']>): RunSummaryTask => {
  const merged = { ...EXECUTION, ...execution };
  const cache = status === 'HIT' ? HIT : MISS;
  const entry: RunSummaryTask = { ...MISS_ENTRY, execution: merged, cache };

  return entry;
};

describe('FEATURE: atom result of a task entry', () => {
  describe('GIVEN a cache HIT that ran for 0 ms', () => {
    it('WHEN read THEN it is cached with a zero duration and the end time', () => {
      const entry = entryWith('HIT', { startTime: 1500, endTime: 1500 });

      expect(atomResultOf(entry)).toStrictEqual({ outcome: 'cached', durationMs: 0, endedAt: 1500 });
    });

    it('WHEN it also exited 1 THEN it is still cached, since HIT is checked first', () => {
      const entry = entryWith('HIT', { exitCode: 1 });

      expect(atomResultOf(entry)).toMatchObject({ outcome: 'cached' });
    });
  });

  describe('GIVEN a cache MISS', () => {
    it('WHEN it exited 0 THEN it passed, lasting the span', () => {
      const entry = entryWith('MISS', { exitCode: 0 });

      expect(atomResultOf(entry)).toStrictEqual({ outcome: 'passed', durationMs: 500, endedAt: 1500 });
    });

    it('WHEN it exited 1 THEN it failed', () => {
      const entry = entryWith('MISS', { exitCode: 1 });

      expect(atomResultOf(entry)).toMatchObject({ outcome: 'failed' });
    });
  });

  describe('GIVEN a span that is not a real duration', () => {
    it('WHEN the end precedes the start THEN the duration is null and the outcome is unchanged', () => {
      const entry = entryWith('MISS', { startTime: 2000, endTime: 1500 });

      expect(atomResultOf(entry)).toStrictEqual({ outcome: 'passed', durationMs: null, endedAt: 1500 });
    });

    it('WHEN the end is infinite THEN the duration is null', () => {
      const entry = entryWith('MISS', { endTime: Infinity });

      expect(atomResultOf(entry)).toMatchObject({ durationMs: null });
    });
  });
});
