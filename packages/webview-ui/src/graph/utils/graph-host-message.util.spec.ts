import { describe, expect, it } from 'vitest';

import { isGraphHostMessage } from './graph-host-message.util.ts';
import type { GraphEdge, Positions } from '../../bridge/common/graph-state.type.ts';

const EDGE: GraphEdge = { source: 'app', target: 'core' };

const EDGES = [EDGE];

const NO_TARGET_EDGE = { source: 'app' };

const NUMERIC_SOURCE_EDGE = { source: 1, target: 'core' };

const ORIGIN = { x: 0, y: 0 };

const POSITIONS: Positions = { app: ORIGIN, core: ORIGIN };

const PACKAGES = [
  { name: 'app', path: 'apps/app', tags: ['ui'], taskCount: 3 },
  { name: 'core', path: 'packages/core', tags: [], taskCount: 0 }
];

const OBJECT_NAMES = [
  { name: '__proto__', path: '', tags: ['__proto__'], taskCount: 0 },
  { name: 'constructor', path: 'packages/constructor', tags: ['constructor'], taskCount: 0 }
];

const ROOT_PACKAGES = [{ name: '//', path: '', tags: [], taskCount: 0 }];

const STRING_PACKAGES = ['app'];

const NULL_PACKAGES = [null];

const UNDEFINED_PACKAGES = [undefined];

const NUMERIC_NAME_PACKAGES = [{ name: 5, path: 'p', tags: [], taskCount: 0 }];

const NO_PATH_PACKAGES = [{ name: 'a', tags: [], taskCount: 0 }];

const NUMERIC_PATH_PACKAGES = [{ name: 'a', path: 1, tags: [], taskCount: 0 }];

const NO_TAGS_PACKAGES = [{ name: 'a', path: 'p', taskCount: 0 }];

const STRING_TAGS_PACKAGES = [{ name: 'a', path: 'p', tags: 'ui', taskCount: 0 }];

const NUMERIC_TAG_PACKAGES = [{ name: 'a', path: 'p', tags: ['ui', 2], taskCount: 0 }];

const NO_TASK_COUNT_PACKAGES = [{ name: 'a', path: 'p', tags: [] }];

const packagesWithTaskCount = (taskCount: unknown): unknown[] => [{ name: 'a', path: 'p', tags: [], taskCount }];

const ZERO_TASK_COUNT_PACKAGES = packagesWithTaskCount(0);

const MAX_TASK_COUNT_PACKAGES = packagesWithTaskCount(100_000);

const EXTREME_TASK_COUNT_PACKAGES = [...ZERO_TASK_COUNT_PACKAGES, ...MAX_TASK_COUNT_PACKAGES];

const MISSING_RESULT = { kind: 'missing', file: 'package.json' };

const UNREADABLE_RESULT = { kind: 'unreadable', file: 'package.json' };

const NO_ENTRIES_RESULT = { kind: 'found', file: 'p', entries: [] };

const EXPLAINED = { type: 'edgeExplained', source: 'app', target: 'core', result: MISSING_RESULT };

const OBJECT_NAMES_EXPLAINED = { type: 'edgeExplained', source: '__proto__', target: 'constructor', result: UNREADABLE_RESULT };

const TASK = {
  id: 'app#build',
  packageName: 'app',
  name: 'build',
  command: 'tsc',
  isRunnable: true,
  dependencies: ['core#build']
};

const TASKS = [TASK, { id: 'core#build', packageName: 'core', name: 'build', command: null, isRunnable: false, dependencies: [] }];

const GRAPH = {
  kind: 'graph',
  hash: 'h',
  packages: PACKAGES,
  edges: EDGES,
  positions: null,
  folderPositions: null,
  tasks: [],
  atomGroups: []
};

const CACHED_GRAPH = { ...GRAPH, positions: POSITIONS };

const WITHOUT_FOLDER_POSITIONS = {
  kind: 'graph',
  hash: 'h',
  packages: PACKAGES,
  edges: EDGES,
  positions: null,
  tasks: [],
  atomGroups: []
};

const WITHOUT_TASKS = {
  kind: 'graph',
  hash: 'h',
  packages: PACKAGES,
  edges: EDGES,
  positions: null,
  folderPositions: null,
  atomGroups: []
};

const WITHOUT_ATOM_GROUPS = {
  kind: 'graph',
  hash: 'h',
  packages: PACKAGES,
  edges: EDGES,
  positions: null,
  folderPositions: null,
  tasks: []
};

const ATOM_FILE = { id: 'app#e2e-ci--a.spec.ts', specPath: 'a.spec.ts', isLive: true };

const ATOM_FILES = [ATOM_FILE];

const ATOM_GROUPS = [{ umbrellaId: 'app#e2e-ci', files: ATOM_FILES }];

const FAILED_FILES = { [ATOM_FILE.id]: 'failed' };

const ATOM_STATE = { counts: '1 files', files: FAILED_FILES };

const ATOM_STATES = { 'app#e2e-ci': ATOM_STATE };

const NO_IS_LIVE_FILES = [{ id: 'f', specPath: 'p' }];

const NO_IS_LIVE_GROUPS = [{ umbrellaId: 'u', files: NO_IS_LIVE_FILES }];

const SKIPPED_FILES = { f: 'skipped' };

const SKIPPED_STATE = { counts: '1 files', files: SKIPPED_FILES };

const SKIPPED_STATES = { u: SKIPPED_STATE };

const LOADING = { kind: 'loading' };

const ERROR = { kind: 'error', message: 'x' };

const SINGLE_PACKAGE = { kind: 'singlePackage' };

const stateMessageOf = (state: unknown): unknown => {
  const message = { type: 'state', state };

  return message;
};

const graphWithTaskOf = (change: object): unknown => {
  const task = { ...TASK, ...change };
  const tasks = [task];

  return stateMessageOf({ ...GRAPH, tasks });
};

const runsMessageOf = (runs: unknown): unknown => {
  const message = { type: 'runs', runs };

  return message;
};

describe('FEATURE: isGraphHostMessage', () => {
  describe('GIVEN a state message', () => {
    it.each([
      ['loading', LOADING],
      ['error', ERROR],
      ['singlePackage', SINGLE_PACKAGE],
      ['graph with no positions', GRAPH],
      ['graph with cached positions', CACHED_GRAPH],
      ['graph with cached folder positions', { ...GRAPH, folderPositions: POSITIONS }],
      ['graph whose packages are named like Object members', { ...GRAPH, packages: OBJECT_NAMES }],
      ['graph with tasks', { ...GRAPH, tasks: TASKS }],
      ['graph with an atom group', { ...GRAPH, atomGroups: ATOM_GROUPS }],
      ['graph with a root package at the empty path', { ...GRAPH, packages: ROOT_PACKAGES }],
      ['graph whose packages have taskCount 0 and 100 000', { ...GRAPH, packages: EXTREME_TASK_COUNT_PACKAGES }]
    ])('WHEN its state is %s THEN it is accepted', (_name, state) => {
      const isMessage = isGraphHostMessage(stateMessageOf(state));

      expect(isMessage).toBe(true);
    });
  });

  describe('GIVEN an edgeExplained message', () => {
    it.each([
      ['a missing result', EXPLAINED],
      ['names like Object members', OBJECT_NAMES_EXPLAINED]
    ])('WHEN it has %s THEN it is accepted', (_name, message) => {
      const isMessage = isGraphHostMessage(message);

      expect(isMessage).toBe(true);
    });

    it('WHEN its result is a found one with no entries THEN it is rejected', () => {
      const isMessage = isGraphHostMessage({ ...EXPLAINED, result: NO_ENTRIES_RESULT });

      expect(isMessage).toBe(false);
    });
  });

  describe('GIVEN a runs message', () => {
    it.each([
      ['no runs', {}],
      ['a running and a failed-to-start task', { 'app#build': 'running', 'core#build': 'failed-to-start' }]
    ])('WHEN it has %s THEN it is accepted', (_name, runs) => {
      const isMessage = isGraphHostMessage({ type: 'runs', runs });

      expect(isMessage).toBe(true);
    });
  });

  describe('GIVEN a showTasks message', () => {
    it.each([
      ['one task id', ['app#build']],
      ['no task ids', []]
    ])('WHEN it has %s THEN it is accepted', (_name, taskIds) => {
      const isMessage = isGraphHostMessage({ type: 'showTasks', taskIds });

      expect(isMessage).toBe(true);
    });
  });

  describe('GIVEN an atoms message', () => {
    it.each([
      ['no groups', {}],
      ['a group with a failed file', ATOM_STATES]
    ])('WHEN it has %s THEN it is accepted', (_name, groups) => {
      const isMessage = isGraphHostMessage({ type: 'atoms', groups });

      expect(isMessage).toBe(true);
    });
  });

  describe('GIVEN anything else', () => {
    it.each([
      ['null', null],
      ['a string', 'state'],
      ['an empty object', {}],
      ['an unknown type', { type: 'nope' }],
      ['a message of an unknown type that carries a state', { type: 'nope', state: GRAPH }],
      ['a state message with no state', { type: 'state' }],
      ['a string state', stateMessageOf('x')],
      ['an unknown state kind', stateMessageOf({ kind: 'other' })],
      ['an error with no message', stateMessageOf({ kind: 'error' })],
      ['a graph with a numeric hash', stateMessageOf({ ...GRAPH, hash: 5 })],
      ['a graph with string packages', stateMessageOf({ ...GRAPH, packages: 'x' })],
      ['a graph with null edges', stateMessageOf({ ...GRAPH, edges: null })],
      ['a graph with a string package', stateMessageOf({ ...GRAPH, packages: STRING_PACKAGES })],
      ['a graph with a null package', stateMessageOf({ ...GRAPH, packages: NULL_PACKAGES })],
      ['a graph with an undefined package', stateMessageOf({ ...GRAPH, packages: UNDEFINED_PACKAGES })],
      ['a graph with a numeric package name', stateMessageOf({ ...GRAPH, packages: NUMERIC_NAME_PACKAGES })],
      ['a graph with a package with no path', stateMessageOf({ ...GRAPH, packages: NO_PATH_PACKAGES })],
      ['a graph with a numeric path', stateMessageOf({ ...GRAPH, packages: NUMERIC_PATH_PACKAGES })],
      ['a graph with a package with no tags', stateMessageOf({ ...GRAPH, packages: NO_TAGS_PACKAGES })],
      ['a graph with string tags', stateMessageOf({ ...GRAPH, packages: STRING_TAGS_PACKAGES })],
      ['a graph with a numeric tag', stateMessageOf({ ...GRAPH, packages: NUMERIC_TAG_PACKAGES })],
      ['a graph with no taskCount', stateMessageOf({ ...GRAPH, packages: NO_TASK_COUNT_PACKAGES })],
      ['a graph with a negative taskCount', stateMessageOf({ ...GRAPH, packages: packagesWithTaskCount(-1) })],
      ['a graph with a fractional taskCount', stateMessageOf({ ...GRAPH, packages: packagesWithTaskCount(1.5) })],
      ['a graph with a taskCount of 100 001', stateMessageOf({ ...GRAPH, packages: packagesWithTaskCount(100_001) })],
      ['a graph with a string taskCount', stateMessageOf({ ...GRAPH, packages: packagesWithTaskCount('3') })],
      ['a graph with a NaN taskCount', stateMessageOf({ ...GRAPH, packages: packagesWithTaskCount(NaN) })],
      ['a graph with a null edge', stateMessageOf({ ...GRAPH, edges: [null] })],
      ['a graph with a string edge', stateMessageOf({ ...GRAPH, edges: ['app>core'] })],
      ['a graph with an edge with no target', stateMessageOf({ ...GRAPH, edges: [NO_TARGET_EDGE] })],
      ['a graph with an edge with a numeric source', stateMessageOf({ ...GRAPH, edges: [NUMERIC_SOURCE_EDGE] })],
      ['a graph with string positions', stateMessageOf({ ...GRAPH, positions: 'x' })],
      ['a graph with string folder positions', stateMessageOf({ ...GRAPH, folderPositions: 'x' })],
      ['a graph with no folderPositions key', stateMessageOf(WITHOUT_FOLDER_POSITIONS)],
      ['a graph with no tasks key', stateMessageOf(WITHOUT_TASKS)],
      ['a graph with no atomGroups key', stateMessageOf(WITHOUT_ATOM_GROUPS)],
      ['a graph with string atomGroups', stateMessageOf({ ...GRAPH, atomGroups: 'x' })],
      ['a graph with a group whose file has no isLive', stateMessageOf({ ...GRAPH, atomGroups: NO_IS_LIVE_GROUPS })],
      ['an atoms message with string groups', { type: 'atoms', groups: 'x' }],
      ['an atoms message with an outcome outside the four', { type: 'atoms', groups: SKIPPED_STATES }],
      ['a graph with string tasks', stateMessageOf({ ...GRAPH, tasks: 'x' })],
      ['a graph with a null task', stateMessageOf({ ...GRAPH, tasks: [null] })],
      ['a graph with a numeric task id', graphWithTaskOf({ id: 1 })],
      ['a graph with a task with no packageName', graphWithTaskOf({ packageName: undefined })],
      ['a graph with a numeric task command', graphWithTaskOf({ command: 7 })],
      ['a graph with a string isRunnable', graphWithTaskOf({ isRunnable: 'yes' })],
      ['a graph with a numeric task dependency', graphWithTaskOf({ dependencies: [1] })],
      ['a runs message with string runs', runsMessageOf('x')],
      ['a runs message with null runs', runsMessageOf(null)],
      ['a runs message with an array of runs', runsMessageOf([])],
      ['a runs message with an unknown run state', runsMessageOf({ 'app#build': 'busy' })],
      ['a runs message with a numeric run state', runsMessageOf({ 'app#build': 5 })],
      ['a showTasks message with a string taskIds', { type: 'showTasks', taskIds: 'a' }],
      ['a showTasks message with a numeric task id', { type: 'showTasks', taskIds: [1] }],
      ['a showTasks message with no taskIds', { type: 'showTasks' }]
    ])('WHEN it is %s THEN it is rejected', (_name, raw) => {
      const isMessage = isGraphHostMessage(raw);

      expect(isMessage).toBe(false);
    });
  });
});
