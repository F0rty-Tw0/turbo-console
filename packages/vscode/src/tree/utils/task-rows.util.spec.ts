import type { PackageNode, RunMatch, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { taskRows } from './task-rows.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import type { IconSpec } from '../common/tree-row.type.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

const BIDI = String.fromCodePoint(0x202e);

const ENDED_AT = 1_700_000_000_000;
const ENDED_AT_ISO = '2023-11-14T22:13:20.000Z';

const IDLE_ICON: IconSpec = { id: 'tools', color: null };
const RUNNING_ICON: IconSpec = { id: 'sync~spin', color: null };
const PASSED_ICON: IconSpec = { id: 'pass', color: 'testing.iconPassed' };

const HIT_MATCH: RunMatch = { cache: 'HIT', durationMs: 3200 };
const MISS_MATCH: RunMatch = { cache: 'MISS', durationMs: 3200 };
const NO_CACHE_MATCH: RunMatch = { cache: null, durationMs: 1200 };

const taskOf = (overrides: Partial<TaskNode>): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: 'a#build', ...overrides };

  return task;
};

const packageWith = (tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks };

  return pkg;
};

const entryIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, ...overrides };

  return entry;
};

const lookupOf = (entry: RunEntry): RunLookup => {
  const lookup: RunLookup = (root, taskId) => {
    const isHeld = root === entry.root && taskId === entry.taskId;

    return isHeld ? entry : undefined;
  };

  return lookup;
};

const tooltipLinesOf = (task: TaskNode, entry: RunEntry): string[] => {
  const runs = lookupOf(entry);
  const rows = taskRows('/ws', packageWith([task]), rowContextOf('list', runs));

  return rows.flatMap((row) => row.tooltip);
};

const factsTooltipOf = (task: TaskNode): string[] => {
  const rows = taskRows('/ws', packageWith([task]), rowContextOf('list'));

  return rows.flatMap((row) => row.tooltip);
};

describe('FEATURE: task rows of a package', () => {
  describe('GIVEN a package with a plain task that never ran', () => {
    it('WHEN listed THEN the row is an idle leaf with the raw task id as key and the package name', () => {
      const rows = taskRows('/ws', packageWith([taskOf({})]), rowContextOf('list'));

      expect(rows).toStrictEqual([
        {
          id: 'task:/ws\0a#build',
          kind: 'task',
          root: '/ws',
          key: 'a#build',
          packageName: 'a',
          label: 'build',
          description: '',
          icon: IDLE_ICON,
          contextValue: 'turboTask',
          collapsible: 'none',
          tooltip: ['Command: tsc', 'Kind: task'],
          command: null
        }
      ]);
    });
  });

  describe('GIVEN a package with umbrella, aggregate and file atom tasks', () => {
    it('WHEN listed THEN the file task is hidden and the others stay in order', () => {
      const tasks = [
        taskOf({ id: 'a#lint', name: 'lint', kind: 'atom-umbrella' }),
        taskOf({ id: 'a#lint:file', name: 'lint:file', kind: 'atom-file' }),
        taskOf({ id: 'a#lint:all', name: 'lint:all', kind: 'atom-aggregate' }),
        taskOf({ id: 'a#build', name: 'build', kind: 'task' })
      ];

      const rows = taskRows('/ws', packageWith(tasks), rowContextOf('list'));

      expect(rows.map((row) => row.label)).toStrictEqual(['lint', 'lint:all', 'build']);
    });
  });

  describe('GIVEN a package with no tasks', () => {
    it('WHEN listed THEN there are no rows', () => {
      const rows = taskRows('/ws', packageWith([]), rowContextOf('list'));

      expect(rows).toStrictEqual([]);
    });
  });

  describe('GIVEN a task name holding a bidi control', () => {
    it('WHEN listed THEN the label is cleaned and the key and id keep the raw id', () => {
      const task = taskOf({ id: `a#b${BIDI}c`, name: `b${BIDI}c` });

      const rows = taskRows('/ws', packageWith([task]), rowContextOf('list'));

      expect(rows).toMatchObject([{ id: `task:/ws\0a#b${BIDI}c`, key: `a#b${BIDI}c`, label: 'bc' }]);
    });
  });

  describe('GIVEN a task name longer than the label limit', () => {
    it('WHEN listed THEN the label is cut', () => {
      const task = taskOf({ name: 'n'.repeat(LABEL_MAX + 30) });

      const rows = taskRows('/ws', packageWith([task]), rowContextOf('list'));

      expect(rows[0]?.label).toBe(`${'n'.repeat(LABEL_MAX - 1)}…`);
    });
  });

  describe('GIVEN a task with a run recorded for its root and id', () => {
    it('WHEN the run is going THEN the row spins and offers Stop through its context value', () => {
      const runs = lookupOf(entryIn({ state: 'running' }));

      const rows = taskRows('/ws', packageWith([taskOf({})]), rowContextOf('list', runs));

      expect(rows).toMatchObject([{ description: 'running…', icon: RUNNING_ICON, contextValue: 'turboTask.running' }]);
    });

    it('WHEN the run passed with a match THEN the row shows the duration and cache status', () => {
      const runs = lookupOf(entryIn({ state: 'passed', exitCode: 0, endedAt: ENDED_AT, match: HIT_MATCH }));

      const rows = taskRows('/ws', packageWith([taskOf({})]), rowContextOf('list', runs));

      expect(rows).toMatchObject([{ description: '3.2s · HIT', icon: PASSED_ICON }]);
    });

    it('WHEN the run belongs to another root THEN the row stays idle', () => {
      const runs = lookupOf(entryIn({ root: '/other', state: 'running' }));

      const rows = taskRows('/ws', packageWith([taskOf({})]), rowContextOf('list', runs));

      expect(rows).toMatchObject([{ description: '', contextValue: 'turboTask' }]);
    });

    it('WHEN the run belongs to another task THEN the row stays idle', () => {
      const runs = lookupOf(entryIn({ taskId: 'a#test', state: 'running' }));

      const rows = taskRows('/ws', packageWith([taskOf({})]), rowContextOf('list', runs));

      expect(rows).toMatchObject([{ description: '', contextValue: 'turboTask' }]);
    });
  });

  describe('GIVEN a task with a description and a command', () => {
    it('WHEN it never ran THEN the tooltip lists description, command and kind in that order', () => {
      const task = taskOf({ description: 'Builds the package', command: 'tsc -b', kind: 'atom-umbrella' });

      const lines = factsTooltipOf(task);

      expect(lines).toStrictEqual(['Builds the package', 'Command: tsc -b', 'Kind: atom-umbrella']);
    });
  });

  describe('GIVEN a task with neither description nor command', () => {
    it('WHEN it never ran THEN the tooltip is the kind alone', () => {
      const task = taskOf({ description: null, command: null });

      const lines = factsTooltipOf(task);

      expect(lines).toStrictEqual(['Kind: task']);
    });
  });

  describe('GIVEN a task whose last run ended with a match', () => {
    it('WHEN the tooltip is built THEN run details follow the task facts: exit code, duration, cache, end time', () => {
      const entry = entryIn({ state: 'failed', exitCode: 1, endedAt: ENDED_AT, match: MISS_MATCH });
      const task = taskOf({ description: 'Builds', command: 'tsc' });

      const lines = tooltipLinesOf(task, entry);

      expect(lines).toStrictEqual([
        'Builds',
        'Command: tsc',
        'Kind: task',
        'Exit code: 1',
        'Duration: 3.2s',
        'Cache: MISS',
        `Ended: ${ENDED_AT_ISO}`
      ]);
    });

    it('WHEN the summary has no cache status THEN the cache line is left out', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, endedAt: ENDED_AT, match: NO_CACHE_MATCH });

      const lines = tooltipLinesOf(taskOf({ command: null }), entry);

      expect(lines).toStrictEqual(['Kind: task', 'Exit code: 0', 'Duration: 1.2s', `Ended: ${ENDED_AT_ISO}`]);
    });
  });

  describe('GIVEN a task whose last run ended without a match', () => {
    it('WHEN the tooltip is built THEN only exit code and end time are added', () => {
      const entry = entryIn({ state: 'failed', exitCode: 2, endedAt: ENDED_AT, match: null });

      const lines = tooltipLinesOf(taskOf({ command: null }), entry);

      expect(lines).toStrictEqual(['Kind: task', 'Exit code: 2', `Ended: ${ENDED_AT_ISO}`]);
    });

    it('WHEN the run has no exit code THEN the exit code line is left out', () => {
      const entry = entryIn({ state: 'failed', exitCode: null, endedAt: ENDED_AT, match: null });

      const lines = tooltipLinesOf(taskOf({ command: null }), entry);

      expect(lines).toStrictEqual(['Kind: task', `Ended: ${ENDED_AT_ISO}`]);
    });

    it('WHEN matching is still in progress THEN a match already set is not shown', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0, endedAt: ENDED_AT, matching: true, match: HIT_MATCH });

      const lines = tooltipLinesOf(taskOf({ command: null }), entry);

      expect(lines).toStrictEqual(['Kind: task', 'Exit code: 0', `Ended: ${ENDED_AT_ISO}`]);
    });
  });

  describe('GIVEN a task whose run is still going', () => {
    it('WHEN the tooltip is built THEN it holds no run details', () => {
      const entry = entryIn({ state: 'running', endedAt: null });

      const lines = tooltipLinesOf(taskOf({ command: null }), entry);

      expect(lines).toStrictEqual(['Kind: task']);
    });
  });
});
