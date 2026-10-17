import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { byName, isRunnableTask, isVisibleTask } from './task-filter.util.ts';
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
    ['a script no turbo config defines', false, taskOf({ isTurboTask: false })],
    ['a file atom task', false, taskOf({ kind: 'atom-file' })]
  ])('GIVEN %s WHEN checked THEN runnable is %s', (_label, isRunnable, task) => {
    expect(isRunnableTask(task)).toBe(isRunnable);
  });
});

describe('FEATURE: task order by name', () => {
  it('WHEN names differ in case THEN the default string order puts capitals first', () => {
    const tasks = [taskOf({ name: 'b' }), taskOf({ name: 'B' }), taskOf({ name: 'a' })];

    expect(tasks.toSorted(byName).map((task) => task.name)).toStrictEqual(['B', 'a', 'b']);
  });
});
