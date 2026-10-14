import type { RunMatch } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { taskDisplay } from './task-display.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { IconSpec } from '../common/tree-row.type.ts';

const entryIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, ...overrides };

  return entry;
};

const IDLE_ICON: IconSpec = { id: 'tools', color: null };
const RUNNING_ICON: IconSpec = { id: 'sync~spin', color: null };
const PASSED_ICON: IconSpec = { id: 'pass', color: 'testing.iconPassed' };
const FAILED_ICON: IconSpec = { id: 'error', color: 'testing.iconFailed' };
const STOPPED_ICON: IconSpec = { id: 'debug-stop', color: 'disabledForeground' };

const HIT_MATCH: RunMatch = { cache: 'HIT', durationMs: 3200 };
const MISS_MATCH: RunMatch = { cache: 'MISS', durationMs: 3200 };
const SHORT_MISS_MATCH: RunMatch = { cache: 'MISS', durationMs: 400 };
const NO_CACHE_MATCH: RunMatch = { cache: null, durationMs: 1234 };

describe('FEATURE: task item display', () => {
  describe('GIVEN a task that never ran', () => {
    it('WHEN displayed THEN it shows the idle wrench with no description', () => {
      const display = taskDisplay(undefined);

      expect(display).toStrictEqual({ icon: IDLE_ICON, description: '', contextValue: 'turboTask' });
    });
  });

  describe('GIVEN a running task', () => {
    it('WHEN displayed THEN it spins, says running and offers Stop through its context value', () => {
      const display = taskDisplay(entryIn({ state: 'running' }));

      expect(display).toStrictEqual({ icon: RUNNING_ICON, description: 'running…', contextValue: 'turboTask.running' });
    });
  });

  describe('GIVEN a passed task whose summary matched', () => {
    it('WHEN the cache hit THEN the description is seconds and HIT', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: HIT_MATCH });

      const display = taskDisplay(entry);

      expect(display).toStrictEqual({ icon: PASSED_ICON, description: '3.2s · HIT', contextValue: 'turboTask' });
    });

    it('WHEN the cache missed THEN the description is seconds and MISS', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: SHORT_MISS_MATCH });

      const display = taskDisplay(entry);

      expect(display.description).toBe('0.4s · MISS');
    });

    it('WHEN the summary has no cache status THEN the description is seconds alone', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: NO_CACHE_MATCH });

      const display = taskDisplay(entry);

      expect(display.description).toBe('1.2s');
    });
  });

  describe('GIVEN a passed task whose summary did not match', () => {
    it('WHEN there is no match THEN the description is exit 0', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: null });

      const display = taskDisplay(entry);

      expect(display).toStrictEqual({ icon: PASSED_ICON, description: 'exit 0', contextValue: 'turboTask' });
    });

    it('WHEN matching is still in progress THEN the description is exit 0 although a match is set', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, matching: true, match: HIT_MATCH });

      const display = taskDisplay(entry);

      expect(display.description).toBe('exit 0');
    });
  });

  describe('GIVEN a failed task whose summary matched', () => {
    it('WHEN displayed THEN the description is the exit code and seconds', () => {
      const entry = entryIn({ state: 'failed', exitCode: 1, match: MISS_MATCH });

      const display = taskDisplay(entry);

      expect(display).toStrictEqual({ icon: FAILED_ICON, description: 'exit 1 · 3.2s', contextValue: 'turboTask' });
    });
  });

  describe('GIVEN a failed task whose summary did not match', () => {
    it('WHEN it has an exit code THEN the description is that exit code', () => {
      const entry = entryIn({ state: 'failed', exitCode: 2, match: null });

      const display = taskDisplay(entry);

      expect(display).toStrictEqual({ icon: FAILED_ICON, description: 'exit 2', contextValue: 'turboTask' });
    });

    it('WHEN it has no exit code THEN the description says so', () => {
      const entry = entryIn({ state: 'failed', exitCode: null, match: null });

      const display = taskDisplay(entry);

      expect(display.description).toBe('no exit code');
    });

    it('WHEN matching is still in progress THEN the description is the exit code alone', () => {
      const entry = entryIn({ state: 'failed', exitCode: 1, matching: true, match: MISS_MATCH });

      const display = taskDisplay(entry);

      expect(display.description).toBe('exit 1');
    });
  });

  describe('GIVEN a task the user stopped', () => {
    it('WHEN displayed THEN it shows the dimmed stop icon and stopped, whatever the exit code and match', () => {
      const entry = entryIn({ state: 'stopped', stopRequested: true, exitCode: 1, match: MISS_MATCH });

      const display = taskDisplay(entry);

      expect(display).toStrictEqual({ icon: STOPPED_ICON, description: 'stopped', contextValue: 'turboTask' });
    });
  });

  describe('GIVEN a task that failed to start', () => {
    it('WHEN displayed THEN it shows the failed icon and failed to start', () => {
      const display = taskDisplay(entryIn({ state: 'failed-to-start' }));

      expect(display).toStrictEqual({ icon: FAILED_ICON, description: 'failed to start', contextValue: 'turboTask' });
    });
  });
});
