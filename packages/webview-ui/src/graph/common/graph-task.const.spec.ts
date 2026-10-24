import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TASK_DEPTH,
  DEPENDENTS_DEPTH_LABEL,
  EMPTY_TASKS_TEXT,
  MAX_TASK_DEPTH,
  MIN_TASK_DEPTH,
  SEARCH_TASKS_LABEL,
  SHOW_ALL_TASKS_LABEL,
  SHOW_TASKS_LABEL,
  TASK_CAP,
  TASK_MODE_LABEL,
  UNKNOWN_TASKS_TEXT
} from './graph-task.const.ts';

describe('FEATURE: graph task constants', () => {
  it.each([
    ['the task cap', TASK_CAP, 300],
    ['the minimum dependents depth', MIN_TASK_DEPTH, 0],
    ['the maximum dependents depth', MAX_TASK_DEPTH, 5],
    ['the default dependents depth', DEFAULT_TASK_DEPTH, 1]
  ])('GIVEN %s WHEN it is read THEN it is the spec value', (_label, value, expected) => {
    expect(value).toBe(expected);
  });

  it.each([
    ['the toggle', TASK_MODE_LABEL, 'Task mode'],
    ['the banner button', SHOW_ALL_TASKS_LABEL, 'Show all tasks'],
    ['the search field', SEARCH_TASKS_LABEL, 'Search tasks'],
    ['the depth field', DEPENDENTS_DEPTH_LABEL, 'Dependents depth'],
    ['the package action', SHOW_TASKS_LABEL, 'Show tasks'],
    ['the invalid request notice', UNKNOWN_TASKS_TEXT, 'Those tasks are not in this workspace'],
    [
      'the empty prompt',
      EMPTY_TASKS_TEXT,
      'Choose tasks to show: select a package and pick Show tasks, use Show in task graph on the details page, or run Turbo Console: Show Task Graph…'
    ]
  ])('GIVEN the copy of %s WHEN it is read THEN it is the spec text', (_label, text, expected) => {
    expect(text).toBe(expected);
  });
});
