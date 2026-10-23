import { describe, expect, it } from 'vitest';

import { isGraphTaskList, isRunsRecord, isTaskIdList } from './graph-task-shape.util.ts';

const TASK = { id: 'a#build', packageName: 'a', name: 'build', command: 'tsc', isRunnable: true, dependencies: ['b#build'] };

describe('FEATURE: graph task list shape', () => {
  it.each([
    ['an empty list', []],
    ['a task with a command', [TASK]],
    ['a task with a null command', [{ ...TASK, command: null }]],
    ['a task with no dependencies', [{ ...TASK, dependencies: [] }]]
  ])('GIVEN %s WHEN checked THEN it is a task list', (_label, value) => {
    expect(isGraphTaskList(value)).toBe(true);
  });

  it.each([
    ['not an array', TASK],
    ['a non-record entry', ['a#build']],
    ['a numeric id', [{ ...TASK, id: 1 }]],
    ['a numeric packageName', [{ ...TASK, packageName: 1 }]],
    ['a numeric name', [{ ...TASK, name: 1 }]],
    ['a numeric command', [{ ...TASK, command: 1 }]],
    ['a missing command', [{ ...TASK, command: undefined }]],
    ['a string isRunnable', [{ ...TASK, isRunnable: 'yes' }]],
    ['a dependencies string', [{ ...TASK, dependencies: 'b#build' }]],
    ['a numeric dependency', [{ ...TASK, dependencies: [1] }]],
    ['one bad task after a good one', [TASK, { ...TASK, id: 1 }]]
  ])('GIVEN %s WHEN checked THEN it is not a task list', (_label, value) => {
    expect(isGraphTaskList(value)).toBe(false);
  });
});

describe('FEATURE: runs record shape', () => {
  it.each([
    ['an empty record', {}],
    ['every run state', { a: 'running', b: 'passed', c: 'failed', d: 'stopped', e: 'failed-to-start' }]
  ])('GIVEN %s WHEN checked THEN it is a runs record', (_label, value) => {
    expect(isRunsRecord(value)).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'running'],
    ['an empty array', []],
    ['an array of run states', ['running']],
    ['an unknown run state', { a: 'busy' }],
    ['a numeric run state', { a: 5 }],
    ['one bad state after a good one', { a: 'passed', b: 'busy' }]
  ])('GIVEN %s WHEN checked THEN it is not a runs record', (_label, value) => {
    expect(isRunsRecord(value)).toBe(false);
  });
});

describe('FEATURE: task id list shape', () => {
  it.each([
    ['an empty list', []],
    ['a list of ids', ['a#build', 'b#build']]
  ])('GIVEN %s WHEN checked THEN it is a task id list', (_label, value) => {
    expect(isTaskIdList(value)).toBe(true);
  });

  it.each([
    ['a string', 'a#build'],
    ['null', null],
    ['a record', { 0: 'a#build' }],
    ['a numeric entry', ['a#build', 1]]
  ])('GIVEN %s WHEN checked THEN it is not a task id list', (_label, value) => {
    expect(isTaskIdList(value)).toBe(false);
  });
});
