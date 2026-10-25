import { describe, expect, it } from 'vitest';

import { isAtomGroupList, isAtomStateRecord, isGraphTaskList, isRunsRecord, isTaskIdList } from './graph-task-shape.util.ts';

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

const FILE = { id: 'app#e2e-ci--a.spec.ts', specPath: 'a.spec.ts', isLive: false };

const GROUP = { umbrellaId: 'app#e2e-ci', files: [FILE] };

const PASSED_FILES = { [FILE.id]: 'passed' };

const STATE = { counts: '1 files', files: PASSED_FILES };

/** A group list of one group with `files`. */
const groupsWithFiles = (files: unknown): unknown[] => [{ ...GROUP, files }];

/** A group list of one group whose only file has `change`. */
const groupsWithFile = (change: object): unknown[] => groupsWithFiles([{ ...FILE, ...change }]);

/** An atom state record of one umbrella with this state. */
const recordOf = (state: unknown): unknown => {
  const record = { a: state };

  return record;
};

/** An atom state record of one umbrella whose state has `change`. */
const recordWith = (change: object): unknown => recordOf({ ...STATE, ...change });

const FILE_WITH_NO_IS_LIVE = { id: FILE.id, specPath: FILE.specPath };

const SKIPPED_FILES = { f: 'skipped' };

const NUMERIC_FILES = { f: 1 };

const BAD_COUNTS_STATE = { ...STATE, counts: 1 };

const GOOD_RECORD = { a: STATE };

const ONE_BAD_RECORD = { ...GOOD_RECORD, b: BAD_COUNTS_STATE };

const EVERY_OUTCOME = { w: 'passed', x: 'failed', y: 'cached', z: 'none' };

const LIMIT = 100_000;

/** `count` groups of no files, each with its own umbrella id. */
const groupsOf = (count: number): unknown[] => {
  const groupAt = (_value: unknown, index: number): unknown => {
    const group = { umbrellaId: `app#${index}`, files: [] };

    return group;
  };

  return Array.from({ length: count }, groupAt);
};

/** `count` file ids, each with the outcome `passed`. */
const outcomesOf = (count: number): Record<string, string> => {
  const entryAt = (_value: unknown, index: number): [string, string] => [`f${index}`, 'passed'];
  const entries = Array.from({ length: count }, entryAt);

  return Object.fromEntries(entries);
};

describe('FEATURE: atom group list shape', () => {
  it.each([
    ['an empty list', []],
    ['a group with a file', [GROUP]],
    ['a group with no files', groupsWithFiles([])],
    ['a live file', groupsWithFile({ isLive: true })]
  ])('GIVEN %s WHEN checked THEN it is a group list', (_label, value) => {
    expect(isAtomGroupList(value)).toBe(true);
  });

  it.each([
    ['no list', undefined],
    ['a record', GROUP],
    ['a non-record group', ['app#e2e-ci']],
    ['a numeric umbrellaId', [{ ...GROUP, umbrellaId: 1 }]],
    ['files that are no array', groupsWithFiles(FILE)],
    ['a non-record file', groupsWithFiles(['a.spec.ts'])],
    ['a numeric file id', groupsWithFile({ id: 1 })],
    ['an empty file id', groupsWithFile({ id: '' })],
    ['a numeric specPath', groupsWithFile({ specPath: 1 })],
    ['a file with no isLive', groupsWithFiles([FILE_WITH_NO_IS_LIVE])],
    ['a string isLive', groupsWithFile({ isLive: 'no' })],
    ['one bad group after a good one', [GROUP, { ...GROUP, umbrellaId: 1 }]],
    ['two groups of one umbrella id', [GROUP, { ...GROUP, files: [] }]]
  ])('GIVEN %s WHEN checked THEN it is not a group list', (_label, value) => {
    expect(isAtomGroupList(value)).toBe(false);
  });

  it('GIVEN 100 000 groups WHEN checked THEN it is a group list', () => {
    expect(isAtomGroupList(groupsOf(LIMIT))).toBe(true);
  });

  it('GIVEN 100 001 groups WHEN checked THEN it is not a group list', () => {
    expect(isAtomGroupList(groupsOf(LIMIT + 1))).toBe(false);
  });

  it('GIVEN a group of 100 001 files WHEN checked THEN it is not a group list', () => {
    const files = Array.from({ length: 100_001 }, () => FILE);
    const groups = groupsWithFiles(files);

    expect(isAtomGroupList(groups)).toBe(false);
  });
});

describe('FEATURE: atom state record shape', () => {
  it.each([
    ['an empty record', {}],
    ['a group with every outcome', recordWith({ counts: '4 files', files: EVERY_OUTCOME })],
    ['a group with no files', recordWith({ counts: '0 files', files: {} })],
    ['counts of 200 characters', recordWith({ counts: 'c'.repeat(200) })],
    ['100 000 files', recordWith({ files: outcomesOf(LIMIT) })]
  ])('GIVEN %s WHEN checked THEN it is an atom state record', (_label, value) => {
    expect(isAtomStateRecord(value)).toBe(true);
  });

  it.each([
    ['null', null],
    ['an array', [STATE]],
    ['a non-record group', recordOf('x')],
    ['numeric counts', recordWith({ counts: 1 })],
    ['no counts', recordOf({ files: STATE.files })],
    ['files that are no record', recordWith({ files: ['passed'] })],
    ['a null files record', recordWith({ files: null })],
    ['an unknown outcome', recordWith({ files: SKIPPED_FILES })],
    ['a numeric outcome', recordWith({ files: NUMERIC_FILES })],
    ['one bad group after a good one', ONE_BAD_RECORD],
    ['counts of 201 characters', recordWith({ counts: 'c'.repeat(201) })],
    ['counts with a line break', recordWith({ counts: '1 files\n2 cached' })],
    ['100 001 files', recordWith({ files: outcomesOf(LIMIT + 1) })]
  ])('GIVEN %s WHEN checked THEN it is not an atom state record', (_label, value) => {
    expect(isAtomStateRecord(value)).toBe(false);
  });
});
