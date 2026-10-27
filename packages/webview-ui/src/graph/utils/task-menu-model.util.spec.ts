import { describe, expect, it, vi } from 'vitest';

import { taskMenuOf } from './task-menu-model.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskMenuActions } from '../common/task-details.type.ts';
import { GRAPH_TASK_STUB } from '../test/stubs/graph-task.stub.ts';
import { itemLabelled, labelsOf } from '../test/utils/widget-menu.spec.util.ts';

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

    it('WHEN Run is read THEN it is a plain enabled menuitem', () => {
      const { role, checked, isDisabled } = itemLabelled(taskMenuOf(GRAPH_TASK_STUB, 'running', actionsMock()), 'Run');

      expect({ role, checked, isDisabled }).toStrictEqual({ role: 'menuitem', checked: null, isDisabled: false });
    });
  });
});
