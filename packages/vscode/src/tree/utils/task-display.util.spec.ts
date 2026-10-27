import type { RunMatch } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { taskDisplay } from './task-display.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { IconSpec } from '../common/tree-row.type.ts';
import { TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';

const NOW = 1_000_000;

const entryIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, ...overrides };

  return entry;
};

const IDLE_ICON: IconSpec = { id: 'tools', color: null };
const RUNNING_ICON: IconSpec = { id: 'sync~spin', color: null };
const PASSED_ICON: IconSpec = { id: 'pass', color: 'testing.iconPassed' };
const FAILED_ICON: IconSpec = { id: 'error', color: 'testing.iconFailed' };
const STOPPED_ICON: IconSpec = { id: 'debug-stop', color: 'descriptionForeground' };

const HIT_MATCH: RunMatch = { cache: 'HIT', durationMs: 3200, interrupted: false };
const MISS_MATCH: RunMatch = { cache: 'MISS', durationMs: 3200, interrupted: false };
const SHORT_MISS_MATCH: RunMatch = { cache: 'MISS', durationMs: 400, interrupted: false };
const NO_CACHE_MATCH: RunMatch = { cache: null, durationMs: 1234, interrupted: false };

describe('FEATURE: task item display of a turbo task', () => {
  describe('GIVEN a task that never ran', () => {
    it('WHEN displayed THEN it shows the idle wrench with no description', () => {
      const display = taskDisplay(TASK_NODE_STUB, undefined, NOW);

      expect(display).toStrictEqual({ icon: IDLE_ICON, description: '', contextValue: 'turboTask' });
    });
  });

  describe('GIVEN a running task', () => {
    it('WHEN displayed THEN it spins, says running with the time since the click and offers Stop', () => {
      const entry = entryIn({ state: 'running', launchedAt: NOW - 12_345 });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display).toStrictEqual({ icon: RUNNING_ICON, description: 'running · 12s', contextValue: 'turboTask.running' });
    });

    it('WHEN the clock reads earlier than the click THEN the elapsed time is 0s', () => {
      const entry = entryIn({ state: 'running', launchedAt: NOW + 5000 });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display.description).toBe('running · 0s');
    });
  });

  describe('GIVEN a passed task whose summary matched', () => {
    it('WHEN the cache hit THEN the description is the duration and cached, and the row offers the cached actions', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: HIT_MATCH });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display).toStrictEqual({ icon: PASSED_ICON, description: '3.2s · cached', contextValue: 'turboTask.cached' });
    });

    it('WHEN the cache missed THEN the description is the duration alone', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: SHORT_MISS_MATCH });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display).toStrictEqual({ icon: PASSED_ICON, description: '0.4s', contextValue: 'turboTask' });
    });

    it('WHEN the summary has no cache status THEN the description is the floored duration alone', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: NO_CACHE_MATCH });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display).toStrictEqual({ icon: PASSED_ICON, description: '1.2s', contextValue: 'turboTask' });
    });
  });

  describe('GIVEN a passed task whose summary did not match', () => {
    it('WHEN there is no match THEN the description is exit 0', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: null });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display).toStrictEqual({ icon: PASSED_ICON, description: 'exit 0', contextValue: 'turboTask' });
    });

    it('WHEN matching is still in progress THEN the description is exit 0 and the row is not cached', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, matching: true, match: HIT_MATCH });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display).toStrictEqual({ icon: PASSED_ICON, description: 'exit 0', contextValue: 'turboTask' });
    });
  });

  describe('GIVEN a failed task whose summary matched', () => {
    it('WHEN displayed THEN the description is the exit code and the duration', () => {
      const entry = entryIn({ state: 'failed', exitCode: 1, match: MISS_MATCH });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display).toStrictEqual({ icon: FAILED_ICON, description: 'exit 1 · 3.2s', contextValue: 'turboTask' });
    });

    it('WHEN the cache hit THEN the row is still not cached', () => {
      const entry = entryIn({ state: 'failed', exitCode: 1, match: HIT_MATCH });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display.contextValue).toBe('turboTask');
    });
  });

  describe('GIVEN a failed task whose summary did not match', () => {
    it('WHEN it has an exit code THEN the description is that exit code', () => {
      const entry = entryIn({ state: 'failed', exitCode: 2, match: null });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display).toStrictEqual({ icon: FAILED_ICON, description: 'exit 2', contextValue: 'turboTask' });
    });

    it('WHEN it has no exit code THEN the description says so', () => {
      const entry = entryIn({ state: 'failed', exitCode: null, match: null });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display.description).toBe('no exit code');
    });

    it('WHEN matching is still in progress THEN the description is the exit code alone', () => {
      const entry = entryIn({ state: 'failed', exitCode: 1, matching: true, match: MISS_MATCH });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display.description).toBe('exit 1');
    });
  });

  describe('GIVEN a task the user stopped', () => {
    it('WHEN it has an end time THEN it shows the stop icon and stopped with the time from click to end', () => {
      const entry = entryIn({
        state: 'stopped',
        stopRequested: true,
        launchedAt: 1000,
        endedAt: 193_000,
        exitCode: 1,
        match: MISS_MATCH
      });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display).toStrictEqual({ icon: STOPPED_ICON, description: 'stopped · 3m 12s', contextValue: 'turboTask' });
    });

    it('WHEN it has no end time THEN the description is stopped alone', () => {
      const entry = entryIn({ state: 'stopped', stopRequested: true, endedAt: null });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display.description).toBe('stopped');
    });
  });

  describe('GIVEN a task that failed to start', () => {
    it('WHEN displayed THEN it shows the failed icon and failed to start', () => {
      const display = taskDisplay(TASK_NODE_STUB, entryIn({ state: 'failed-to-start' }), NOW);

      expect(display).toStrictEqual({ icon: FAILED_ICON, description: 'failed to start', contextValue: 'turboTask' });
    });
  });
});
