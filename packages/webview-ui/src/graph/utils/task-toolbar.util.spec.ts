import { describe, expect, it, vi } from 'vitest';

import { taskMenuOf } from './task-menu-model.util.ts';
import { TASK_TOOLBAR_ORDER, runActionOf, taskToolbarShownOf } from './task-toolbar.util.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskMenuActions } from '../common/task-details.type.ts';
import { GRAPH_TASK_STUB, ROOT_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';

const NOT_RUNNABLE: GraphTask = { ...GRAPH_TASK_STUB, isRunnable: false };
const ROOT_NOT_RUNNABLE: GraphTask = { ...ROOT_BUILD_STUB, isRunnable: false };

type ShownCase = {
  readonly title: string;
  readonly task: GraphTask;
  readonly state: GraphRunState | null;
  readonly isCompact: boolean;
  readonly expected: string[];
};

const SHOWN_CASES: ShownCase[] = [
  {
    title: 'a runnable task, idle',
    task: GRAPH_TASK_STUB,
    state: null,
    isCompact: false,
    expected: ['run', 'showPackage', 'ellipsis']
  },
  {
    title: 'a runnable task, running',
    task: GRAPH_TASK_STUB,
    state: 'running',
    isCompact: false,
    expected: ['run', 'showPackage', 'ellipsis']
  },
  { title: 'a task that is not runnable, idle', task: NOT_RUNNABLE, state: null, isCompact: false, expected: ['showPackage'] },
  {
    title: 'a task that is not runnable, continuous',
    task: NOT_RUNNABLE,
    state: 'continuous',
    isCompact: false,
    expected: ['run', 'showPackage', 'ellipsis']
  },
  { title: 'a runnable root task', task: ROOT_BUILD_STUB, state: null, isCompact: false, expected: ['run', 'ellipsis'] },
  { title: 'a root task that is not runnable', task: ROOT_NOT_RUNNABLE, state: null, isCompact: false, expected: [] },
  { title: 'a runnable task at a compact zoom', task: GRAPH_TASK_STUB, state: null, isCompact: true, expected: ['ellipsis'] },
  { title: 'a task that is not runnable at a compact zoom', task: NOT_RUNNABLE, state: null, isCompact: true, expected: [] }
];

const actionsMock = (): TaskMenuActions => {
  const actions: TaskMenuActions = { act: vi.fn<TaskMenuActions['act']>() };

  return actions;
};

describe('FEATURE: task toolbar model', () => {
  describe('GIVEN a task and its run state', () => {
    it.each(SHOWN_CASES)('WHEN the buttons are listed for $title THEN they read $expected', ({ task, state, isCompact, expected }) => {
      const shown = taskToolbarShownOf(task, state, isCompact);

      expect(shown).toStrictEqual(expected);
    });

    it.each(SHOWN_CASES)(
      'WHEN $title is listed THEN the "…" shows exactly when the task menu has items',
      ({ task, state, isCompact }) => {
        const shown = taskToolbarShownOf(task, state, isCompact);
        const menu = taskMenuOf(task, state, actionsMock());

        expect(shown.includes('ellipsis')).toBe(menu.length > 0);
      }
    );

    it('WHEN the buttons are listed THEN each shown kind follows the toolbar order', () => {
      const shown = taskToolbarShownOf(GRAPH_TASK_STUB, null, false);

      expect(shown).toStrictEqual(TASK_TOOLBAR_ORDER);
    });
  });

  describe('GIVEN a run state', () => {
    it.each([
      { state: null, expected: 'run' },
      { state: 'passed', expected: 'run' },
      { state: 'failed', expected: 'run' },
      { state: 'running', expected: 'stop' },
      { state: 'continuous', expected: 'stop' }
    ] as const)('WHEN the state is $state THEN the slot runs $expected', ({ state, expected }) => {
      const action = runActionOf(state);

      expect(action).toBe(expected);
    });
  });
});
