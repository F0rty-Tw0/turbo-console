import { describe, expect, it } from 'vitest';

import { DEFAULT_TASK_DEPTH, MAX_TASK_DEPTH, MIN_TASK_DEPTH, TASK_CAP } from './graph-task.const.ts';

describe('FEATURE: graph task constants', () => {
  it.each([
    ['the task cap', TASK_CAP, 300],
    ['the minimum dependents depth', MIN_TASK_DEPTH, 0],
    ['the maximum dependents depth', MAX_TASK_DEPTH, 5],
    ['the default dependents depth', DEFAULT_TASK_DEPTH, 1]
  ])('GIVEN %s WHEN it is read THEN it is the spec value', (_label, value, expected) => {
    expect(value).toBe(expected);
  });
});
