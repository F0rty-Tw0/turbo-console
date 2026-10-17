import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { byName, isOfferedTask, isRunnableTask, isVisibleTask } from './task-filter.util.ts';
import { TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';

const taskOf = (overrides: Partial<TaskNode>): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: 'a#build', ...overrides };

  return task;
};

describe('FEATURE: visible task', () => {
  it.each([
    ['a plain task', true, taskOf({})],
    ['a script', true, taskOf({ isTurboTask: false })],
    ['a file atom task', false, taskOf({ kind: 'atom-file' })]
  ])('GIVEN %s WHEN checked THEN visible is %s', (_label, isVisible, task) => {
    expect(isVisibleTask(task)).toBe(isVisible);
  });
});

describe('FEATURE: runnable task', () => {
  it.each([
    ['a visible turbo task', true, taskOf({})],
    ['a continuous turbo task', true, taskOf({ persistent: true })],
    ['a script with a safe name', true, taskOf({ isTurboTask: false })],
    ['a script whose name a shell could misread', false, taskOf({ isTurboTask: false, name: 'a b' })],
    ['a turbo task with an odd name', true, taskOf({ name: 'a b' })],
    ['a turbo task with no command', true, taskOf({ command: null })],
    ['a script with no command', false, taskOf({ isTurboTask: false, command: null })],
    ['a script with a whitespace-only command', false, taskOf({ isTurboTask: false, command: ' \t ' })],
    ['a file atom task', false, taskOf({ kind: 'atom-file' })]
  ])('GIVEN %s WHEN checked THEN runnable is %s', (_label, isRunnable, task) => {
    expect(isRunnableTask(task)).toBe(isRunnable);
  });
});

describe('FEATURE: offered task', () => {
  it.each([
    ['a turbo task', false, true, taskOf({})],
    ['a turbo task', true, true, taskOf({})],
    ['a safe script', false, false, taskOf({ isTurboTask: false })],
    ['a safe script', true, true, taskOf({ isTurboTask: false })],
    ['a refused script', true, false, taskOf({ isTurboTask: false, name: 'a;b' })],
    ['a script with no command', true, false, taskOf({ isTurboTask: false, command: null })],
    ['a script with a blank command', true, false, taskOf({ isTurboTask: false, command: '  ' })],
    ['a file atom task', true, false, taskOf({ kind: 'atom-file' })]
  ])('GIVEN %s and scripts shown is %s WHEN checked THEN offered is %s', (_label, scriptsShown, isOffered, task) => {
    expect(isOfferedTask(task, scriptsShown)).toBe(isOffered);
  });
});

describe('FEATURE: task order by name', () => {
  it('WHEN names differ in case THEN the default string order puts capitals first', () => {
    const tasks = [taskOf({ name: 'b' }), taskOf({ name: 'B' }), taskOf({ name: 'a' })];

    expect(tasks.toSorted(byName).map((task) => task.name)).toStrictEqual(['B', 'a', 'b']);
  });
});
