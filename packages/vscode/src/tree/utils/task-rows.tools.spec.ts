import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { taskRowOf } from './task-rows.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';
import { toolLookupMock } from '../test/mocks/tool-lookup.mock.ts';
import { PACKAGE_NODE_STUB, ROW_SCOPE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

const LAUNCHED_AT = 1_699_999_990_000;
const ENDED_AT = 1_700_000_000_000;

const taskOf = (overrides: Partial<TaskNode>): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: 'a#build', command: null, ...overrides };

  return task;
};

const scriptOf = (command: string | null): TaskNode => taskOf({ isTurboTask: false, name: 'lint', command });

const entryIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, launchedAt: LAUNCHED_AT, endedAt: ENDED_AT, ...overrides };

  return entry;
};

const rowOf = (task: TaskNode, entry?: RunEntry): TreeRow => {
  const runs: RunLookup = () => entry;
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [task] };
  const row = taskRowOf(ROW_SCOPE_STUB, pkg, task.id, rowContextOf('list', runs));

  if (row === undefined) throw new Error(`no row for ${task.id}`);

  return row;
};

const iconIdOf = (task: TaskNode, entry?: RunEntry): string => rowOf(task, entry).icon.id;

const tooltipOf = (task: TaskNode): string[] => rowOf(task).tooltip;

describe('FEATURE: tool icon and tooltip line on a task row', () => {
  describe('GIVEN an idle task whose command runs a tool with a glyph', () => {
    it('WHEN it is a turbo task running vitest THEN the row takes the vitest glyph icon with no colour', () => {
      const row = rowOf(taskOf({ command: 'vitest' }));

      expect(row.icon).toStrictEqual({ id: 'turbo-console-vitest', color: null });
    });

    it('WHEN it is a script running eslint THEN the row takes the eslint glyph icon', () => {
      const id = iconIdOf(scriptOf('eslint .'));

      expect(id).toBe('turbo-console-eslint');
    });

    it('WHEN the swap happens THEN id, description and context value stay what a plain idle row has', () => {
      const plain = rowOf(taskOf({ command: 'node x.js' }));
      const turbo = rowOf(taskOf({ command: 'vitest' }));
      const plainScript = rowOf(scriptOf('node x.js'));
      const script = rowOf(scriptOf('eslint .'));

      expect(turbo).toMatchObject({ id: plain.id, description: plain.description, contextValue: 'turboTask' });
      expect(script).toMatchObject({ id: plainScript.id, description: plainScript.description, contextValue: 'turboScript' });
    });
  });

  describe('GIVEN an idle task that has another icon already', () => {
    it('WHEN it is continuous THEN the server icon stays', () => {
      const id = iconIdOf(taskOf({ persistent: true, command: 'vite dev' }));

      expect(id).toBe('server-process');
    });

    it('WHEN its tool has no glyph THEN the wrench stays', () => {
      const id = iconIdOf(taskOf({ command: 'playwright test' }));

      expect(id).toBe('tools');
    });

    it('WHEN no tool is detected THEN the wrench stays', () => {
      const id = iconIdOf(taskOf({ command: 'node x.js' }));

      expect(id).toBe('tools');
    });
  });

  describe('GIVEN a vitest task with a run entry', () => {
    it.each([
      ['running', 'sync~spin'],
      ['passed', 'pass'],
      ['failed', 'error']
    ] as const)('WHEN it is %s THEN the run icon %s wins over the logo', (state, expected) => {
      const id = iconIdOf(taskOf({ command: 'vitest' }), entryIn({ state }));

      expect(id).toBe(expected);
    });
  });

  describe('GIVEN a detected tool', () => {
    it('WHEN the task is a turbo task THEN the Tool line follows the Command line', () => {
      const lines = tooltipOf(taskOf({ command: 'vitest' }));

      expect(lines).toStrictEqual(['Command: vitest', 'Tool: Vitest', 'Kind: task']);
    });

    it('WHEN the task is a script THEN the Tool line follows the Script line after the manager command', () => {
      const lines = tooltipOf(scriptOf('eslint .'));

      expect(lines).toStrictEqual(['Command: pnpm run lint', 'Script: eslint .', 'Tool: ESLint', 'Kind: task']);
    });

    it('WHEN the script name is refused THEN the Script line still gets the Tool line', () => {
      const lines = tooltipOf(taskOf({ isTurboTask: false, name: 'a b', command: 'eslint .' }));

      expect(lines).toStrictEqual(['Script: eslint .', 'Tool: ESLint', 'Kind: task']);
    });

    it('WHEN the tool has no glyph THEN the line names it and the icon stays the wrench', () => {
      const task = taskOf({ command: 'playwright test' });

      expect(tooltipOf(task)).toStrictEqual(['Command: playwright test', 'Tool: Playwright', 'Kind: task']);
      expect(iconIdOf(task)).toBe('tools');
    });

    it('WHEN the task passed THEN the Tool line comes before the run lines', () => {
      const entry = entryIn({ state: 'passed', exitCode: 0 });

      const row = rowOf(taskOf({ command: 'vitest' }), entry);

      expect(row.tooltip.slice(0, 4)).toStrictEqual(['Command: vitest', 'Tool: Vitest', 'Kind: task', 'Exit code: 0']);
    });
  });

  describe('GIVEN no detected tool', () => {
    it('WHEN the command runs a plain script THEN there is no Tool line', () => {
      const lines = tooltipOf(taskOf({ command: 'node x.js' }));

      expect(lines).toStrictEqual(['Command: node x.js', 'Kind: task']);
    });
  });

  describe('GIVEN a row context with its own tool lookup', () => {
    it('WHEN a task row is built THEN the lookup is asked for the task command', () => {
      const tools = toolLookupMock();
      const task = taskOf({ command: 'vitest' });
      const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [task] };
      const listContext = rowContextOf('list');
      const context: RowContext = { ...listContext, tools };

      taskRowOf(ROW_SCOPE_STUB, pkg, task.id, context);

      expect(tools).toHaveBeenCalledWith('vitest');
    });
  });
});
