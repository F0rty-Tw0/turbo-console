import { describe, expect, it } from 'vitest';

import {
  isAtomCounts,
  isAtomGroupList,
  isAtomStateRecord,
  isGraphTaskList,
  isOwnersRecord,
  isRunsRecord,
  isTaskIdList
} from './graph-task-shape.util.ts';
import { TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';

const TASK = {
  id: 'a#build',
  packageName: 'a',
  name: 'build',
  command: 'tsc',
  isRunnable: true,
  isTurboTask: true,
  dependencies: ['b#build']
};

describe('FEATURE: graph task list shape', () => {
  it.each([
    ['an empty list', []],
    ['a task with a command', [TASK]],
    ['a task with a null command', [{ ...TASK, command: null }]],
    ['a task with no dependencies', [{ ...TASK, dependencies: [] }]],
    ['a script task', [{ ...TASK, isTurboTask: false }]]
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
    ['a missing isTurboTask', [{ ...TASK, isTurboTask: undefined }]],
    ['a string isTurboTask', [{ ...TASK, isTurboTask: 'yes' }]],
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
    ['every run state', { a: 'running', b: 'passed', c: 'failed', d: 'stopped', e: 'failed-to-start', f: 'continuous' }]
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

const ONE_FILE_COUNTS = { files: 1, cached: null, failed: null };

const STATE = { counts: ONE_FILE_COUNTS, files: PASSED_FILES };

const EVERY_COUNT = { files: 4, cached: 2, failed: 1 };

const NO_FILE_COUNTS = { files: 0, cached: null, failed: null };

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

/** An atom state record of one umbrella whose state has `counts`. */
const recordWithCounts = (counts: unknown): unknown => recordWith({ counts });

const FILE_WITH_NO_IS_LIVE = { id: FILE.id, specPath: FILE.specPath };

const SKIPPED_FILES = { f: 'skipped' };

const NUMERIC_FILES = { f: 1 };

const BAD_COUNTS_STATE = { ...STATE, counts: 1 };

const GOOD_RECORD = { a: STATE };

const ONE_BAD_RECORD = { ...GOOD_RECORD, b: BAD_COUNTS_STATE };

const EVERY_OUTCOME = { w: 'passed', x: 'failed', y: 'cached', z: 'none' };

/** `count` groups of no files, each with its own umbrella id. */
const groupsOf = (count: number): unknown[] => {
  const groupAt = (_value: unknown, index: number): unknown => {
    const group = { umbrellaId: `app#${index}`, files: [] };

    return group;
  };

  return Array.from({ length: count }, groupAt);
};

/** `count` ids, each with `value`. */
const idsWith = (count: number, value: string): Record<string, string> => {
  const entryAt = (_value: unknown, index: number): [string, string] => [`k${index}`, value];
  const entries = Array.from({ length: count }, entryAt);

  return Object.fromEntries(entries);
};

const PASSED = 'passed';

const WEB_BUILD = 'web#build';

/** A JSON object whose keys are the names of `Object.prototype` members: they parse to own keys. */
const PROTOTYPE_NAMED = '{"__proto__":"web#build","constructor":"web#build"}';

const PROTOTYPE_NAMED_WITH_NUMBER = '{"__proto__":1,"constructor":"web#build"}';

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

  it('GIVEN TASK_COUNT_MAX groups WHEN checked THEN it is a group list', () => {
    expect(isAtomGroupList(groupsOf(TASK_COUNT_MAX))).toBe(true);
  });

  it('GIVEN TASK_COUNT_MAX + 1 groups WHEN checked THEN it is not a group list', () => {
    expect(isAtomGroupList(groupsOf(TASK_COUNT_MAX + 1))).toBe(false);
  });

  it('GIVEN a group of TASK_COUNT_MAX + 1 files WHEN checked THEN it is not a group list', () => {
    const files = Array.from({ length: TASK_COUNT_MAX + 1 }, () => FILE);
    const groups = groupsWithFiles(files);

    expect(isAtomGroupList(groups)).toBe(false);
  });
});

describe('FEATURE: atom state record shape', () => {
  it.each([
    ['an empty record', {}],
    ['a group with every outcome', recordWith({ counts: EVERY_COUNT, files: EVERY_OUTCOME })],
    ['a group with no files', recordWith({ counts: NO_FILE_COUNTS, files: {} })],
    ['TASK_COUNT_MAX files', recordWith({ files: idsWith(TASK_COUNT_MAX, PASSED) })]
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
    ['string counts', recordWithCounts('10 files')],
    ['negative files', recordWithCounts({ files: -1, cached: null, failed: null })],
    ['fractional cached', recordWithCounts({ files: 1, cached: 0.5, failed: null })],
    ['failed over the cap', recordWithCounts({ files: 1, cached: null, failed: TASK_COUNT_MAX + 1 })],
    ['counts with no failed key', recordWithCounts({ files: 1, cached: null })],
    ['TASK_COUNT_MAX + 1 files', recordWith({ files: idsWith(TASK_COUNT_MAX + 1, PASSED) })]
  ])('GIVEN %s WHEN checked THEN it is not an atom state record', (_label, value) => {
    expect(isAtomStateRecord(value)).toBe(false);
  });
});

const COUNTS = { files: 10, cached: 3, failed: 1 };

const OVER = TASK_COUNT_MAX + 1;

describe('FEATURE: atom counts shape', () => {
  it.each([
    ['all null but files', { files: 0, cached: null, failed: null }],
    ['every number', COUNTS],
    ['zeros', { files: 0, cached: 0, failed: 0 }],
    ['TASK_COUNT_MAX in each', { files: TASK_COUNT_MAX, cached: TASK_COUNT_MAX, failed: TASK_COUNT_MAX }]
  ])('GIVEN counts with %s WHEN checked THEN they are atom counts', (_label, value) => {
    expect(isAtomCounts(value)).toBe(true);
  });

  it.each([
    ['a string', '10 files'],
    ['null', null],
    ['an array', [10, 3, 1]],
    ['no keys', {}],
    ['no cached key', { files: 10, failed: null }],
    ['no failed key', { files: 10, cached: null }],
    ['null files', { ...COUNTS, files: null }],
    ['string files', { ...COUNTS, files: '10' }],
    ['negative files', { ...COUNTS, files: -1 }],
    ['fractional files', { ...COUNTS, files: 1.5 }],
    ['NaN files', { ...COUNTS, files: Number.NaN }],
    ['Infinity files', { ...COUNTS, files: Number.POSITIVE_INFINITY }],
    ['files over the cap', { ...COUNTS, files: OVER }],
    ['negative cached', { ...COUNTS, cached: -1 }],
    ['fractional cached', { ...COUNTS, cached: 2.5 }],
    ['string cached', { ...COUNTS, cached: '3' }],
    ['cached over the cap', { ...COUNTS, cached: OVER }],
    ['negative failed', { ...COUNTS, failed: -1 }],
    ['fractional failed', { ...COUNTS, failed: 0.5 }],
    ['string failed', { ...COUNTS, failed: '1' }],
    ['failed over the cap', { ...COUNTS, failed: OVER }]
  ])('GIVEN counts with %s WHEN checked THEN they are not atom counts', (_label, value) => {
    expect(isAtomCounts(value)).toBe(false);
  });
});

describe('FEATURE: the owners of a runs message (spec D11)', () => {
  it.each([
    ['one owner', { 'ui#build': 'web#build' }],
    ['no keys', {}],
    ['TASK_COUNT_MAX keys', idsWith(TASK_COUNT_MAX, WEB_BUILD)],
    ['keys named like Object.prototype members', JSON.parse(PROTOTYPE_NAMED)]
  ])('GIVEN owners as %s WHEN checked THEN it is an owners record', (_label, value) => {
    const isOwners = isOwnersRecord(value);

    expect(isOwners).toBe(true);
  });

  it.each([
    ['TASK_COUNT_MAX + 1 keys', idsWith(TASK_COUNT_MAX + 1, WEB_BUILD)],
    ['an empty owner id', { 'ui#build': '' }],
    ['a number owner', { 'ui#build': 1 }],
    ['a number owner under the key __proto__', JSON.parse(PROTOTYPE_NAMED_WITH_NUMBER)],
    ['a null owner', { 'ui#build': null }],
    ['an array', ['web#build']],
    ['null', null],
    ['a string', 'web#build']
  ])('GIVEN owners as %s WHEN checked THEN it is not an owners record', (_label, value) => {
    const isOwners = isOwnersRecord(value);

    expect(isOwners).toBe(false);
  });
});
