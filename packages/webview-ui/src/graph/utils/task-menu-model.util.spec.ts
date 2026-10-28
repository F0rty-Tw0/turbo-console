import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { taskMenuOf } from './task-menu-model.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskMenuActions } from '../common/task-details.type.ts';
import { graphIconConstMock } from '../test/mocks/graph-icon-const.mock.ts';
import { SWAPPED_ACTION_ICONS_STUB as SWAPPED } from '../test/stubs/action-icons.stub.ts';
import { GRAPH_TASK_STUB } from '../test/stubs/graph-task.stub.ts';
import { iconsOf, itemLabelled, labelsOf } from '../test/utils/widget-menu.spec.util.ts';

const NOT_RUNNABLE: GraphTask = { ...GRAPH_TASK_STUB, isRunnable: false };

const actionsMock = (): TaskMenuActions => {
  const actions: TaskMenuActions = { act: vi.fn<TaskMenuActions['act']>() };

  return actions;
};

describe('FEATURE: taskMenuOf', () => {
  it.each([
    { title: 'a runnable task, idle', task: GRAPH_TASK_STUB, state: null, expected: ['Run', 'Run without cache'] },
    { title: 'a runnable task that passed', task: GRAPH_TASK_STUB, state: 'passed', expected: ['Run', 'Run without cache'] },
    { title: 'a runnable task, running', task: GRAPH_TASK_STUB, state: 'running', expected: ['Run', 'Run without cache', 'Stop'] },
    {
      title: 'a runnable task, continuous',
      task: GRAPH_TASK_STUB,
      state: 'continuous',
      expected: ['Run', 'Run without cache', 'Stop']
    },
    { title: 'a task that is not runnable, idle', task: NOT_RUNNABLE, state: null, expected: [] },
    { title: 'a task that is not runnable, running', task: NOT_RUNNABLE, state: 'running', expected: ['Stop'] }
  ] as const)('GIVEN $title WHEN its menu is listed THEN it reads $expected', ({ task, state, expected }) => {
    const labels = labelsOf(taskMenuOf(task, state, actionsMock()));

    expect(labels).toStrictEqual(expected);
  });

  describe('GIVEN a runnable task a#build, running', () => {
    it.each([
      { label: 'Run', action: 'run' },
      { label: 'Run without cache', action: 'runNoCache' },
      { label: 'Stop', action: 'stop' }
    ] as const)('WHEN $label runs THEN only $action is asked for a#build', ({ label, action }) => {
      const actions = actionsMock();

      itemLabelled(taskMenuOf(GRAPH_TASK_STUB, 'running', actions), label).run();

      expect(actions.act).toHaveBeenCalledExactlyOnceWith('a#build', action);
    });

    it('WHEN Run is read THEN it is an enabled item with the run icon', () => {
      const { icon, isDisabled } = itemLabelled(taskMenuOf(GRAPH_TASK_STUB, 'running', actionsMock()), 'Run');

      expect({ icon, isDisabled }).toStrictEqual({ icon: 'play', isDisabled: false });
    });

    it('WHEN its icons are read THEN Run, Run without cache and Stop draw play, debug-rerun and debug-stop', () => {
      const icons = iconsOf(taskMenuOf(GRAPH_TASK_STUB, 'running', actionsMock()));

      expect(icons).toStrictEqual(['play', 'debug-rerun', 'debug-stop']);
    });
  });
});

describe('FEATURE: task menu icons from the action icon table', () => {
  beforeEach((): void => {
    vi.resetModules();
    vi.doMock('../common/graph-icon.const.ts', (): object => graphIconConstMock(SWAPPED));
  });

  afterEach((): void => {
    vi.doUnmock('../common/graph-icon.const.ts');
    vi.resetModules();
  });

  describe('GIVEN a table where every action draws another icon', () => {
    it('WHEN a running task menu is built THEN its icons follow the table', async () => {
      const swapped = await import('./task-menu-model.util.ts');
      const model = swapped.taskMenuOf(GRAPH_TASK_STUB, 'running', actionsMock());

      expect(iconsOf(model)).toStrictEqual([SWAPPED.run, SWAPPED.runNoCache, SWAPPED.stop]);
    });
  });
});
