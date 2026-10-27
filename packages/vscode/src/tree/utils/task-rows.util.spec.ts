import type { PackageNode, RunMatch, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { taskRowOf, taskRows } from './task-rows.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import type { IconSpec } from '../common/tree-row.type.ts';
import { PACKAGE_NODE_STUB, ROW_SCOPE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { ROW_NOW, rowContextOf } from '../test/utils/row-context.spec.util.ts';

const BIDI = String.fromCodePoint(0x202e);

const ENDED_AT = 1_700_000_000_000;

const IDLE_ICON: IconSpec = { id: 'tools', color: null };
const TYPESCRIPT_ICON: IconSpec = { id: 'turbo-console-typescript', color: null };
const RUNNING_ICON: IconSpec = { id: 'sync~spin', color: 'charts.yellow' };
const PASSED_ICON: IconSpec = { id: 'pass', color: 'testing.iconPassed' };

const HIT_MATCH: RunMatch = { cache: 'HIT', durationMs: 3200, interrupted: false };

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

const factsTooltipOf = (task: TaskNode): string[] => {
  const rows = taskRows(ROW_SCOPE_STUB, packageWith([task]), rowContextOf('list'));

  return rows.flatMap((row) => row.tooltip);
};

describe('FEATURE: task rows of a package', () => {
  describe('GIVEN a package with a plain task that never ran', () => {
    it('WHEN listed THEN the row is an idle leaf with the raw task id as key and the package name', () => {
      const rows = taskRows(ROW_SCOPE_STUB, packageWith([taskOf({})]), rowContextOf('list'));

      expect(rows).toStrictEqual([
        {
          id: 'task:/ws\0a#build',
          kind: 'task',
          root: '/ws',
          key: 'a#build',
          packageName: 'a',
          label: 'build',
          description: '',
          icon: TYPESCRIPT_ICON,
          contextValue: 'turboTask',
          collapsible: 'none',
          tooltip: ['Command: tsc', 'Tool: TypeScript', 'Kind: task'],
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

      const rows = taskRows(ROW_SCOPE_STUB, packageWith(tasks), rowContextOf('list'));

      expect(rows.map((row) => row.label)).toStrictEqual(['lint', 'lint:all', 'build']);
    });
  });

  describe('GIVEN a package with no tasks', () => {
    it('WHEN listed THEN there are no rows', () => {
      const rows = taskRows(ROW_SCOPE_STUB, packageWith([]), rowContextOf('list'));

      expect(rows).toStrictEqual([]);
    });
  });

  describe('GIVEN a task name holding a bidi control', () => {
    it('WHEN listed THEN the label is cleaned and the key and id keep the raw id', () => {
      const task = taskOf({ id: `a#b${BIDI}c`, name: `b${BIDI}c` });

      const rows = taskRows(ROW_SCOPE_STUB, packageWith([task]), rowContextOf('list'));

      expect(rows).toMatchObject([{ id: `task:/ws\0a#b${BIDI}c`, key: `a#b${BIDI}c`, label: 'bc' }]);
    });
  });

  describe('GIVEN a task name longer than the label limit', () => {
    it('WHEN listed THEN the label is cut', () => {
      const task = taskOf({ name: 'n'.repeat(LABEL_MAX + 30) });

      const rows = taskRows(ROW_SCOPE_STUB, packageWith([task]), rowContextOf('list'));

      expect(rows[0]?.label).toBe(`${'n'.repeat(LABEL_MAX - 1)}…`);
    });
  });

  describe('GIVEN a task with a run recorded for its root and id', () => {
    it('WHEN the run is going THEN the row spins, counts from the context clock and offers Stop through its context value', () => {
      const runs = lookupOf(entryIn({ state: 'running', launchedAt: ROW_NOW - 12_345 }));

      const rows = taskRows(ROW_SCOPE_STUB, packageWith([taskOf({})]), rowContextOf('list', runs));

      expect(rows).toMatchObject([{ description: 'running · 12s', icon: RUNNING_ICON, contextValue: 'turboTask.running' }]);
    });

    it('WHEN the run passed with a cache hit THEN the row shows the duration and cached', () => {
      const runs = lookupOf(entryIn({ state: 'passed', exitCode: 0, endedAt: ENDED_AT, match: HIT_MATCH }));

      const rows = taskRows(ROW_SCOPE_STUB, packageWith([taskOf({})]), rowContextOf('list', runs));

      expect(rows).toMatchObject([{ description: '3.2s · cached', icon: PASSED_ICON, contextValue: 'turboTask.cached' }]);
    });

    it('WHEN the run belongs to another root THEN the row stays idle', () => {
      const runs = lookupOf(entryIn({ root: '/other', state: 'running' }));

      const rows = taskRows(ROW_SCOPE_STUB, packageWith([taskOf({})]), rowContextOf('list', runs));

      expect(rows).toMatchObject([{ description: '', contextValue: 'turboTask' }]);
    });

    it('WHEN the run belongs to another task THEN the row stays idle', () => {
      const runs = lookupOf(entryIn({ taskId: 'a#test', state: 'running' }));

      const rows = taskRows(ROW_SCOPE_STUB, packageWith([taskOf({})]), rowContextOf('list', runs));

      expect(rows).toMatchObject([{ description: '', contextValue: 'turboTask' }]);
    });
  });

  describe('GIVEN a task with a description and a command', () => {
    it('WHEN it never ran THEN the tooltip lists description, command and kind in that order', () => {
      const task = taskOf({ description: 'Builds the package', command: 'tsc -b', kind: 'atom-umbrella' });

      const lines = factsTooltipOf(task);

      expect(lines).toStrictEqual(['Builds the package', 'Command: tsc -b', 'Tool: TypeScript', 'Kind: atom-umbrella']);
    });
  });

  describe('GIVEN a task with neither description nor command', () => {
    it('WHEN it never ran THEN the tooltip is the kind alone', () => {
      const task = taskOf({ description: null, command: null });

      const lines = factsTooltipOf(task);

      expect(lines).toStrictEqual(['Kind: task']);
    });
  });

  describe('GIVEN a package script no turbo config defines', () => {
    it('WHEN listed THEN it is an idle wrench row with no text that offers Run and Copy', () => {
      const row = taskRowOf(
        ROW_SCOPE_STUB,
        packageWith([taskOf({ isTurboTask: false, command: 'make build' })]),
        'a#build',
        rowContextOf('list')
      );

      expect(row).toMatchObject({ label: 'build', description: '', icon: IDLE_ICON, contextValue: 'turboScript' });
    });
  });
});

describe('FEATURE: one task row by id', () => {
  describe('GIVEN a package with a file atom task a#lint:file and tasks a#lint and a#build', () => {
    const pkg = packageWith([
      taskOf({ id: 'a#lint', name: 'lint', kind: 'atom-umbrella' }),
      taskOf({ id: 'a#lint:file', name: 'lint:file', kind: 'atom-file' }),
      taskOf({ id: 'a#build', name: 'build', kind: 'task' })
    ]);

    it('WHEN a#build is read THEN its row equals the one the package listing builds', () => {
      const context = rowContextOf('list');
      const listed = taskRows(ROW_SCOPE_STUB, pkg, context);

      const row = taskRowOf(ROW_SCOPE_STUB, pkg, 'a#build', context);

      expect(row).toStrictEqual(listed[1]);
    });

    it('WHEN the hidden file atom task is read THEN there is no row', () => {
      const row = taskRowOf(ROW_SCOPE_STUB, pkg, 'a#lint:file', rowContextOf('list'));

      expect(row).toBeUndefined();
    });

    it('WHEN an id the package does not hold is read THEN there is no row', () => {
      const row = taskRowOf(ROW_SCOPE_STUB, pkg, 'b#build', rowContextOf('list'));

      expect(row).toBeUndefined();
    });
  });
});
