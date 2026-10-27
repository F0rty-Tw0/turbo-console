import type { RunMatch, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { taskDisplay } from './task-display.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { IconSpec } from '../common/tree-row.type.ts';
import { TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';

const NOW = 1_000_000;

const CONTINUOUS: TaskNode = { ...TASK_NODE_STUB, persistent: true };
const SCRIPT: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };
const CONTINUOUS_SCRIPT: TaskNode = { ...CONTINUOUS, isTurboTask: false };

const CONTINUOUS_IDLE_ICON: IconSpec = { id: 'server-process', color: null };
const CONTINUOUS_RUNNING_ICON: IconSpec = { id: 'pulse', color: 'charts.green' };
const IDLE_ICON: IconSpec = { id: 'tools', color: null };
const RUNNING_ICON: IconSpec = { id: 'sync~spin', color: 'charts.yellow' };
const PASSED_ICON: IconSpec = { id: 'pass', color: 'testing.iconPassed' };
const FAILED_ICON: IconSpec = { id: 'error', color: 'testing.iconFailed' };
const STOPPED_ICON: IconSpec = { id: 'debug-stop', color: 'descriptionForeground' };

const HIT_MATCH: RunMatch = { cache: 'HIT', durationMs: 3200, interrupted: false };

const entryIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, ...overrides };

  return entry;
};

describe('FEATURE: task item display of continuous tasks and scripts', () => {
  describe('GIVEN a continuous task', () => {
    it('WHEN it never ran THEN it shows the server icon and continuous', () => {
      const display = taskDisplay(CONTINUOUS, undefined, NOW);

      expect(display).toStrictEqual({ icon: CONTINUOUS_IDLE_ICON, description: 'continuous', contextValue: 'turboTask' });
    });

    it('WHEN it runs THEN it shows the pulse, continuous with the time since the click, and offers Stop', () => {
      const entry = entryIn({ task: CONTINUOUS, state: 'running', launchedAt: NOW - 12_345 });

      const display = taskDisplay(CONTINUOUS, entry, NOW);

      expect(display).toStrictEqual({
        icon: CONTINUOUS_RUNNING_ICON,
        description: 'continuous · 12s',
        contextValue: 'turboTask.running'
      });
    });

    it('WHEN it was stopped THEN it shows the stop cells with the time from click to end', () => {
      const entry = entryIn({ task: CONTINUOUS, state: 'stopped', launchedAt: 1000, endedAt: 193_000, exitCode: 0 });

      const display = taskDisplay(CONTINUOUS, entry, NOW);

      expect(display).toStrictEqual({ icon: STOPPED_ICON, description: 'stopped · 3m 12s', contextValue: 'turboTask' });
    });

    it('WHEN it crashed THEN it shows the failed cells', () => {
      const entry = entryIn({ task: CONTINUOUS, state: 'failed', endedAt: 4000, exitCode: 1 });

      const display = taskDisplay(CONTINUOUS, entry, NOW);

      expect(display).toStrictEqual({ icon: FAILED_ICON, description: 'exit 1', contextValue: 'turboTask' });
    });

    it('WHEN it failed to start THEN it shows the failed-to-start cells', () => {
      const entry = entryIn({ task: CONTINUOUS, state: 'failed-to-start' });

      const display = taskDisplay(CONTINUOUS, entry, NOW);

      expect(display).toStrictEqual({ icon: FAILED_ICON, description: 'failed to start', contextValue: 'turboTask' });
    });
  });

  describe('GIVEN a task whose config turned it continuous', () => {
    it('WHEN its last run, launched before the edit, ended THEN its kind no longer shows', () => {
      const entry = entryIn({ state: 'passed', endedAt: 4000, exitCode: 0, match: HIT_MATCH });

      const display = taskDisplay(CONTINUOUS, entry, NOW);

      expect(display).toStrictEqual({ icon: PASSED_ICON, description: '3.2s · cached', contextValue: 'turboTask.cached' });
    });

    it('WHEN it never ran THEN the current node decides and it reads continuous', () => {
      const display = taskDisplay(CONTINUOUS, undefined, NOW);

      expect(display.description).toBe('continuous');
    });
  });

  describe('GIVEN a script no turbo config defines', () => {
    it('WHEN it never ran THEN it shows the plain wrench with no text and offers Run and Copy', () => {
      const display = taskDisplay(SCRIPT, undefined, NOW);

      expect(display).toStrictEqual({ icon: IDLE_ICON, description: '', contextValue: 'turboScript' });
    });

    it('WHEN its run is live THEN it spins with the time since the click and offers Stop', () => {
      const entry = entryIn({ task: SCRIPT, state: 'running', launchedAt: NOW - 12_345 });

      const display = taskDisplay(SCRIPT, entry, NOW);

      expect(display).toStrictEqual({ icon: RUNNING_ICON, description: 'running · 12s', contextValue: 'turboScript.running' });
    });

    it('WHEN its run passed THEN it shows the local duration, not the exit code', () => {
      const entry = entryIn({ task: SCRIPT, state: 'passed', launchedAt: 1000, endedAt: 3100, exitCode: 0 });

      const display = taskDisplay(SCRIPT, entry, NOW);

      expect(display).toStrictEqual({ icon: PASSED_ICON, description: '2.1s', contextValue: 'turboScript' });
    });

    it.each([3, 127])('WHEN its run failed with exit %i THEN it shows the exit code alone', (exitCode) => {
      const entry = entryIn({ task: SCRIPT, state: 'failed', endedAt: 4000, exitCode });

      const display = taskDisplay(SCRIPT, entry, NOW);

      expect(display).toStrictEqual({ icon: FAILED_ICON, description: `exit ${exitCode}`, contextValue: 'turboScript' });
    });

    it('WHEN its run was stopped THEN it shows the stop cells with the time from click to end', () => {
      const entry = entryIn({ task: SCRIPT, state: 'stopped', launchedAt: 1000, endedAt: 4000, exitCode: 130 });

      const display = taskDisplay(SCRIPT, entry, NOW);

      expect(display).toStrictEqual({ icon: STOPPED_ICON, description: 'stopped · 3.0s', contextValue: 'turboScript' });
    });

    it('WHEN its run failed to start THEN it shows the failed-to-start cells', () => {
      const entry = entryIn({ task: SCRIPT, state: 'failed-to-start' });

      const display = taskDisplay(SCRIPT, entry, NOW);

      expect(display).toStrictEqual({ icon: FAILED_ICON, description: 'failed to start', contextValue: 'turboScript' });
    });
  });

  describe('GIVEN a continuous task launched without turbo', () => {
    it('WHEN its run is live THEN it shows the pulse, continuous with the time since the click, and offers Stop', () => {
      const entry = entryIn({ task: CONTINUOUS_SCRIPT, state: 'running', launchedAt: NOW - 12_345 });

      const display = taskDisplay(CONTINUOUS, entry, NOW);

      expect(display).toStrictEqual({
        icon: CONTINUOUS_RUNNING_ICON,
        description: 'continuous · 12s',
        contextValue: 'turboScript.running'
      });
    });
  });

  describe('GIVEN a node whose kind changed since the run launched', () => {
    it('WHEN a turbo run is live on a node that is a script now THEN it stays turboTask.running', () => {
      const entry = entryIn({ state: 'running', launchedAt: NOW - 12_345 });

      const display = taskDisplay(SCRIPT, entry, NOW);

      expect(display).toStrictEqual({ icon: RUNNING_ICON, description: 'running · 12s', contextValue: 'turboTask.running' });
    });

    it('WHEN a continuous run is live on a node that is a script now THEN it keeps the pulse and still offers Stop', () => {
      const entry = entryIn({ task: CONTINUOUS, state: 'running', launchedAt: NOW - 12_345 });

      const display = taskDisplay(SCRIPT, entry, NOW);

      expect(display).toStrictEqual({
        icon: CONTINUOUS_RUNNING_ICON,
        description: 'continuous · 12s',
        contextValue: 'turboTask.running'
      });
    });

    it('WHEN a script run is live on a node that is turbo now THEN it is turboScript.running', () => {
      const entry = entryIn({ task: SCRIPT, state: 'running', launchedAt: NOW - 12_345 });

      const display = taskDisplay(TASK_NODE_STUB, entry, NOW);

      expect(display).toStrictEqual({ icon: RUNNING_ICON, description: 'running · 12s', contextValue: 'turboScript.running' });
    });

    it('WHEN a script run is live on a node that is continuous now THEN it still spins', () => {
      const entry = entryIn({ task: SCRIPT, state: 'running', launchedAt: NOW - 12_345 });

      const display = taskDisplay(CONTINUOUS, entry, NOW);

      expect(display).toStrictEqual({ icon: RUNNING_ICON, description: 'running · 12s', contextValue: 'turboScript.running' });
    });

    it('WHEN a turbo run ended on a node that is a script now THEN its match shows and the node offers Run and Copy', () => {
      const entry = entryIn({ state: 'passed', endedAt: 4000, exitCode: 0, match: HIT_MATCH });

      const display = taskDisplay(SCRIPT, entry, NOW);

      expect(display).toStrictEqual({ icon: PASSED_ICON, description: '3.2s · cached', contextValue: 'turboScript' });
    });
  });
});
