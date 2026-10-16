import type { PackageNode, RunMatch, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { taskRows } from './task-rows.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { PACKAGE_NODE_STUB, ROW_SCOPE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

const LAUNCHED_AT = 1_699_999_990_000;
const STARTED = 'Started: 2023-11-14T22:13:10.000Z';
const ENDED_AT = 1_700_000_000_000;
const ENDED = 'Ended: 2023-11-14T22:13:20.000Z';

const HIT_MATCH: RunMatch = { cache: 'HIT', durationMs: 3200 };
const MISS_MATCH: RunMatch = { cache: 'MISS', durationMs: 3200 };
const NO_CACHE_MATCH: RunMatch = { cache: null, durationMs: 1200 };

const taskOf = (overrides: Partial<TaskNode>): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: 'a#build', command: null, ...overrides };

  return task;
};

const entryIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, launchedAt: LAUNCHED_AT, endedAt: ENDED_AT, ...overrides };

  return entry;
};

const tooltipLinesOf = (task: TaskNode, entry?: RunEntry): string[] => {
  const runs: RunLookup = () => entry;
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [task] };
  const rows = taskRows(ROW_SCOPE_STUB, pkg, rowContextOf('list', runs));

  return rows.flatMap((row) => row.tooltip);
};

describe('FEATURE: task row tooltip', () => {
  describe('GIVEN a task that never ran', () => {
    it('WHEN it is continuous THEN a kind line comes first', () => {
      const lines = tooltipLinesOf(taskOf({ persistent: true, command: 'vite' }));

      expect(lines).toStrictEqual(['Continuous task: runs until stopped (persistent)', 'Command: vite', 'Kind: task']);
    });

    it('WHEN it is a script THEN the package manager command, the script body and the kind follow the description', () => {
      const lines = tooltipLinesOf(taskOf({ isTurboTask: false, name: 'lint', description: 'Formats', command: 'eslint .' }));

      expect(lines).toStrictEqual(['Formats', 'Command: pnpm run lint', 'Script: eslint .', 'Kind: task']);
    });

    it('WHEN it is a script with no body THEN only the command and the kind are listed', () => {
      const lines = tooltipLinesOf(taskOf({ isTurboTask: false, name: 'lint', command: null }));

      expect(lines).toStrictEqual(['Command: pnpm run lint', 'Kind: task']);
    });

    it('WHEN the script name is refused THEN there is no Command line but the body and kind stay', () => {
      const lines = tooltipLinesOf(taskOf({ isTurboTask: false, name: 'a b', command: 'eslint .' }));

      expect(lines).toStrictEqual(['Script: eslint .', 'Kind: task']);
    });

    it('WHEN it is a turbo task with a body THEN the body is its Command', () => {
      const lines = tooltipLinesOf(taskOf({ command: 'tsc' }));

      expect(lines).toStrictEqual(['Command: tsc', 'Kind: task']);
    });

    it('WHEN it is a plain turbo task THEN there is no kind line', () => {
      const lines = tooltipLinesOf(taskOf({}));

      expect(lines).toStrictEqual(['Kind: task']);
    });
  });

  describe('GIVEN a task whose run is still going', () => {
    it('WHEN the tooltip is built THEN only the start time follows the task facts', () => {
      const lines = tooltipLinesOf(taskOf({}), entryIn({ state: 'running', endedAt: null }));

      expect(lines).toStrictEqual(['Kind: task', STARTED]);
    });
  });

  describe('GIVEN a task whose run failed to start', () => {
    it('WHEN the tooltip is built THEN only the start time follows the task facts', () => {
      const lines = tooltipLinesOf(taskOf({}), entryIn({ state: 'failed-to-start' }));

      expect(lines).toStrictEqual(['Kind: task', STARTED]);
    });
  });

  describe('GIVEN a task whose last run ended with a match', () => {
    it('WHEN the cache hit THEN exit code, duration, the replayed cache line, start and end follow the facts', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: HIT_MATCH });

      const lines = tooltipLinesOf(taskOf({ description: 'Builds', command: 'tsc' }), entry);

      expect(lines).toStrictEqual([
        'Builds',
        'Command: tsc',
        'Kind: task',
        'Exit code: 0',
        'Duration: 3.2s',
        'Cache: replayed from cache',
        STARTED,
        ENDED
      ]);
    });

    it('WHEN the cache missed THEN the cache line says it ran', () => {
      const entry = entryIn({ state: 'failed', exitCode: 1, match: MISS_MATCH });

      const lines = tooltipLinesOf(taskOf({}), entry);

      expect(lines).toStrictEqual(['Kind: task', 'Exit code: 1', 'Duration: 3.2s', 'Cache: not cached, ran', STARTED, ENDED]);
    });

    it('WHEN the cache missed on a run without cache THEN the cache line says it was skipped', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: MISS_MATCH, force: true });

      const lines = tooltipLinesOf(taskOf({}), entry);

      expect(lines).toStrictEqual([
        'Kind: task',
        'Exit code: 0',
        'Duration: 3.2s',
        'Cache: skipped (Run Without Cache)',
        STARTED,
        ENDED
      ]);
    });

    it('WHEN a forced run reports a hit THEN the cache line still says replayed', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: HIT_MATCH, force: true });

      const lines = tooltipLinesOf(taskOf({}), entry);

      expect(lines).toContain('Cache: replayed from cache');
    });

    it('WHEN the summary has no cache status THEN the cache line is left out', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, match: NO_CACHE_MATCH });

      const lines = tooltipLinesOf(taskOf({}), entry);

      expect(lines).toStrictEqual(['Kind: task', 'Exit code: 0', 'Duration: 1.2s', STARTED, ENDED]);
    });
  });

  describe('GIVEN a task whose last run ended without a match', () => {
    it('WHEN it has an exit code THEN exit code, start and end follow the facts', () => {
      const lines = tooltipLinesOf(taskOf({}), entryIn({ state: 'failed', exitCode: 2 }));

      expect(lines).toStrictEqual(['Kind: task', 'Exit code: 2', STARTED, ENDED]);
    });

    it('WHEN the run has no exit code THEN the exit code line is left out', () => {
      const lines = tooltipLinesOf(taskOf({}), entryIn({ state: 'failed', exitCode: null }));

      expect(lines).toStrictEqual(['Kind: task', STARTED, ENDED]);
    });

    it('WHEN matching is still in progress THEN a match already set is not shown', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, matching: true, match: HIT_MATCH });

      const lines = tooltipLinesOf(taskOf({}), entry);

      expect(lines).toStrictEqual(['Kind: task', 'Exit code: 0', STARTED, ENDED]);
    });
  });

  describe('GIVEN a task the user stopped', () => {
    it('WHEN it has an end time THEN start and end follow the facts, whatever the exit code', () => {
      const lines = tooltipLinesOf(taskOf({}), entryIn({ state: 'stopped', stopRequested: true, exitCode: 1 }));

      expect(lines).toStrictEqual(['Kind: task', STARTED, ENDED]);
    });

    it('WHEN it has no end time THEN only the start time follows the facts', () => {
      const lines = tooltipLinesOf(taskOf({}), entryIn({ state: 'stopped', stopRequested: true, endedAt: null }));

      expect(lines).toStrictEqual(['Kind: task', STARTED]);
    });
  });
});
