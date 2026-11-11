import { describe, expect, it } from 'vitest';

import { isGraphHostMessage } from './graph-host-message.util.ts';
import type { Positions } from '../../bridge/common/graph-state.type.ts';
import {
  HOST_EDGES_STUB,
  HOST_GRAPH_STUB,
  HOST_PACKAGES_STUB,
  HOST_TASK_STUB,
  IMPORT_SITE_STUB
} from '../test/stubs/graph-host-message.stub.ts';
import { graphWithTaskOf, stateMessageOf, without } from '../test/utils/graph-host-message.spec.util.ts';

const NO_TARGET_EDGE = { source: 'app' };

const NUMERIC_SOURCE_EDGE = { source: 1, target: 'core' };

const ORIGIN = { x: 0, y: 0 };

const POSITIONS: Positions = { app: ORIGIN, core: ORIGIN };

const OBJECT_NAMES = [
  { name: '__proto__', bareName: '__proto__', path: '', tags: ['__proto__'], taskCount: 0 },
  { name: 'constructor', bareName: 'constructor', path: 'packages/constructor', tags: ['constructor'], taskCount: 0 }
];

const FAILED_IMPORTS = { kind: 'failed' };

const FOUND_IMPORTS = { kind: 'found', scanned: 4, skipped: 0, total: 1, limit: null, sites: [IMPORT_SITE_STUB] };

const DONE_IMPORTS = { kind: 'done' };

const IMPORTS = { type: 'edgeImports', source: 'web', target: 'core', result: FAILED_IMPORTS };

const FOUND_IMPORTS_MESSAGE = { ...IMPORTS, result: FOUND_IMPORTS };

const ROOT_PACKAGES = [{ name: '//', bareName: '//', path: '', tags: [], taskCount: 0 }];

const STRING_PACKAGES = ['app'];

const NULL_PACKAGES = [null];

const UNDEFINED_PACKAGES = [undefined];

const NUMERIC_NAME_PACKAGES = [{ name: 5, bareName: 'p', path: 'p', tags: [], taskCount: 0 }];

const NO_PATH_PACKAGES = [{ name: 'a', bareName: 'a', tags: [], taskCount: 0 }];

const NUMERIC_PATH_PACKAGES = [{ name: 'a', bareName: 'a', path: 1, tags: [], taskCount: 0 }];

const NO_TAGS_PACKAGES = [{ name: 'a', bareName: 'a', path: 'p', taskCount: 0 }];

const STRING_TAGS_PACKAGES = [{ name: 'a', bareName: 'a', path: 'p', tags: 'ui', taskCount: 0 }];

const NUMERIC_TAG_PACKAGES = [{ name: 'a', bareName: 'a', path: 'p', tags: ['ui', 2], taskCount: 0 }];

const NO_TASK_COUNT_PACKAGES = [{ name: 'a', bareName: 'a', path: 'p', tags: [] }];

const packagesWithTaskCount = (taskCount: unknown): unknown[] => [{ name: 'a', bareName: 'a', path: 'p', tags: [], taskCount }];

const ZERO_TASK_COUNT_PACKAGES = packagesWithTaskCount(0);

const MAX_TASK_COUNT_PACKAGES = packagesWithTaskCount(100_000);

const EXTREME_TASK_COUNT_PACKAGES = [...ZERO_TASK_COUNT_PACKAGES, ...MAX_TASK_COUNT_PACKAGES];

const MISSING_RESULT = { kind: 'missing', file: 'package.json' };

const UNREADABLE_RESULT = { kind: 'unreadable', file: 'package.json' };

const NO_ENTRIES_RESULT = { kind: 'found', file: 'p', entries: [] };

const EXPLAINED = { type: 'edgeExplained', source: 'app', target: 'core', result: MISSING_RESULT };

const OBJECT_NAMES_EXPLAINED = { type: 'edgeExplained', source: '__proto__', target: 'constructor', result: UNREADABLE_RESULT };

const TASKS = [
  HOST_TASK_STUB,
  { id: 'core#build', packageName: 'core', name: 'build', command: null, isRunnable: false, isTurboTask: true, dependencies: [] }
];

const CACHED_GRAPH = { ...HOST_GRAPH_STUB, positions: POSITIONS };

const WITHOUT_FOLDER_POSITIONS = {
  kind: 'graph',
  hash: 'h',
  packages: HOST_PACKAGES_STUB,
  edges: HOST_EDGES_STUB,
  positions: null,
  routes: null,
  folderRoutes: null,
  tasks: [],
  atomGroups: [],
  singlePackage: false,
  rootLabel: null,
  scopeShown: true,
  scriptsShown: true,
  predictionShown: false,
  affectedShown: false
};

const WITHOUT_TASKS = {
  kind: 'graph',
  hash: 'h',
  packages: HOST_PACKAGES_STUB,
  edges: HOST_EDGES_STUB,
  positions: null,
  routes: null,
  folderRoutes: null,
  folderPositions: null,
  atomGroups: [],
  singlePackage: false,
  rootLabel: null,
  scopeShown: true,
  scriptsShown: true,
  predictionShown: false,
  affectedShown: false
};

const WITHOUT_ATOM_GROUPS = {
  kind: 'graph',
  hash: 'h',
  packages: HOST_PACKAGES_STUB,
  edges: HOST_EDGES_STUB,
  positions: null,
  routes: null,
  folderRoutes: null,
  folderPositions: null,
  tasks: [],
  singlePackage: false,
  rootLabel: null,
  scopeShown: true,
  scriptsShown: true,
  predictionShown: false,
  affectedShown: false
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

const runsMessageOf = (runs: unknown): unknown => {
  const message = { type: 'runs', runs };

  return message;
};

const RUNNING = { 'ui#build': 'running' };

const OWNED_BY_WEB = { 'ui#build': 'web#build' };

/** Parsed, so `__proto__` and `constructor` arrive as own keys, as they would from a posted message. */
const PROTOTYPE_NAMED_OWNERS: unknown = JSON.parse('{"__proto__":"web#build","constructor":"web#build"}');

const ownedRunsMessageOf = (runs: unknown, owners: unknown): unknown => {
  const message = { type: 'runs', runs, owners };

  return message;
};

describe('FEATURE: isGraphHostMessage', () => {
  describe('GIVEN a state message', () => {
    it.each([
      ['loading', LOADING],
      ['error', ERROR],
      ['graph with no positions', HOST_GRAPH_STUB],
      ['graph of a single-package root', { ...HOST_GRAPH_STUB, singlePackage: true, rootLabel: 'single-app' }],
      ['graph with cached positions', CACHED_GRAPH],
      ['graph with cached folder positions', { ...HOST_GRAPH_STUB, folderPositions: POSITIONS }],
      ['graph whose packages are named like Object members', { ...HOST_GRAPH_STUB, packages: OBJECT_NAMES }],
      ['graph with tasks', { ...HOST_GRAPH_STUB, tasks: TASKS }],
      ['graph with an atom group', { ...HOST_GRAPH_STUB, atomGroups: ATOM_GROUPS }],
      ['graph with a root package at the empty path', { ...HOST_GRAPH_STUB, packages: ROOT_PACKAGES }],
      ['graph whose packages have taskCount 0 and 100 000', { ...HOST_GRAPH_STUB, packages: EXTREME_TASK_COUNT_PACKAGES }]
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

  describe('GIVEN an edgeImports message', () => {
    it.each([
      { label: 'a failed result', message: IMPORTS },
      { label: 'a found result', message: FOUND_IMPORTS_MESSAGE }
    ])('WHEN it has $label THEN it is accepted', ({ message }) => {
      const isMessage = isGraphHostMessage(message);

      expect(isMessage).toBe(true);
    });

    it('WHEN its result is of an unknown kind THEN it is rejected', () => {
      const isMessage = isGraphHostMessage({ ...IMPORTS, result: DONE_IMPORTS });

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

    it('WHEN its predictions is not an object THEN it is still accepted', () => {
      const isMessage = isGraphHostMessage({ type: 'runs', runs: {}, predictions: 5 });

      expect(isMessage).toBe(true);
    });
  });

  describe('GIVEN a runs message with or without owners', () => {
    it.each([
      ['runs without owners', runsMessageOf(RUNNING)],
      ['runs with owners', ownedRunsMessageOf(RUNNING, OWNED_BY_WEB)],
      ['runs with owners keyed like Object.prototype members', ownedRunsMessageOf(RUNNING, PROTOTYPE_NAMED_OWNERS)]
    ])('WHEN a posted %s is narrowed THEN it is a host message', (_name, raw) => {
      const isMessage = isGraphHostMessage(raw);

      expect(isMessage).toBe(true);
    });

    it.each([
      ['runs with an array of owners', ownedRunsMessageOf({}, ['web#build'])],
      ['runs with owners: null', ownedRunsMessageOf({}, null)],
      ['bad runs with good owners', ownedRunsMessageOf({ 'ui#build': 'ok' }, {})]
    ])('WHEN a posted %s is narrowed THEN it is not a host message', (_name, raw) => {
      const isMessage = isGraphHostMessage(raw);

      expect(isMessage).toBe(false);
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

  it('GIVEN a showPackage message WHEN it names a package THEN it is accepted', () => {
    const isMessage = isGraphHostMessage({ type: 'showPackage', name: 'web' });

    expect(isMessage).toBe(true);
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
      ['a message of an unknown type that carries a state', { type: 'nope', state: HOST_GRAPH_STUB }],
      ['a state message with no state', { type: 'state' }],
      ['a string state', stateMessageOf('x')],
      ['an unknown state kind', stateMessageOf({ kind: 'other' })],
      ['an error with no message', stateMessageOf({ kind: 'error' })],
      ['a graph with a numeric hash', stateMessageOf({ ...HOST_GRAPH_STUB, hash: 5 })],
      ['a graph with string packages', stateMessageOf({ ...HOST_GRAPH_STUB, packages: 'x' })],
      ['a graph with null edges', stateMessageOf({ ...HOST_GRAPH_STUB, edges: null })],
      ['a graph with a string package', stateMessageOf({ ...HOST_GRAPH_STUB, packages: STRING_PACKAGES })],
      ['a graph with a null package', stateMessageOf({ ...HOST_GRAPH_STUB, packages: NULL_PACKAGES })],
      ['a graph with an undefined package', stateMessageOf({ ...HOST_GRAPH_STUB, packages: UNDEFINED_PACKAGES })],
      ['a graph with a numeric package name', stateMessageOf({ ...HOST_GRAPH_STUB, packages: NUMERIC_NAME_PACKAGES })],
      ['a graph with a package with no path', stateMessageOf({ ...HOST_GRAPH_STUB, packages: NO_PATH_PACKAGES })],
      ['a graph with a numeric path', stateMessageOf({ ...HOST_GRAPH_STUB, packages: NUMERIC_PATH_PACKAGES })],
      ['a graph with a package with no tags', stateMessageOf({ ...HOST_GRAPH_STUB, packages: NO_TAGS_PACKAGES })],
      ['a graph with string tags', stateMessageOf({ ...HOST_GRAPH_STUB, packages: STRING_TAGS_PACKAGES })],
      ['a graph with a numeric tag', stateMessageOf({ ...HOST_GRAPH_STUB, packages: NUMERIC_TAG_PACKAGES })],
      ['a graph with no taskCount', stateMessageOf({ ...HOST_GRAPH_STUB, packages: NO_TASK_COUNT_PACKAGES })],
      ['a graph with a negative taskCount', stateMessageOf({ ...HOST_GRAPH_STUB, packages: packagesWithTaskCount(-1) })],
      ['a graph with a fractional taskCount', stateMessageOf({ ...HOST_GRAPH_STUB, packages: packagesWithTaskCount(1.5) })],
      ['a graph with a taskCount of 100 001', stateMessageOf({ ...HOST_GRAPH_STUB, packages: packagesWithTaskCount(100_001) })],
      ['a graph with a string taskCount', stateMessageOf({ ...HOST_GRAPH_STUB, packages: packagesWithTaskCount('3') })],
      ['a graph with a NaN taskCount', stateMessageOf({ ...HOST_GRAPH_STUB, packages: packagesWithTaskCount(NaN) })],
      ['a graph with a null edge', stateMessageOf({ ...HOST_GRAPH_STUB, edges: [null] })],
      ['a graph with a string edge', stateMessageOf({ ...HOST_GRAPH_STUB, edges: ['app>core'] })],
      ['a graph with an edge with no target', stateMessageOf({ ...HOST_GRAPH_STUB, edges: [NO_TARGET_EDGE] })],
      ['a graph with an edge with a numeric source', stateMessageOf({ ...HOST_GRAPH_STUB, edges: [NUMERIC_SOURCE_EDGE] })],
      ['a graph with string positions', stateMessageOf({ ...HOST_GRAPH_STUB, positions: 'x' })],
      ['a graph with string folder positions', stateMessageOf({ ...HOST_GRAPH_STUB, folderPositions: 'x' })],
      ['a graph with no folderPositions key', stateMessageOf(WITHOUT_FOLDER_POSITIONS)],
      ['a graph with no singlePackage', stateMessageOf(without(HOST_GRAPH_STUB, 'singlePackage'))],
      ['a graph with string singlePackage', stateMessageOf({ ...HOST_GRAPH_STUB, singlePackage: 'yes' })],
      ['a graph with no rootLabel', stateMessageOf(without(HOST_GRAPH_STUB, 'rootLabel'))],
      ['a graph with numeric rootLabel', stateMessageOf({ ...HOST_GRAPH_STUB, rootLabel: 3 })],
      ['a state of kind singlePackage', stateMessageOf({ kind: 'singlePackage' })],
      ['a graph with no tasks key', stateMessageOf(WITHOUT_TASKS)],
      ['a graph with no atomGroups key', stateMessageOf(WITHOUT_ATOM_GROUPS)],
      ['a graph with string atomGroups', stateMessageOf({ ...HOST_GRAPH_STUB, atomGroups: 'x' })],
      ['a graph with a group whose file has no isLive', stateMessageOf({ ...HOST_GRAPH_STUB, atomGroups: NO_IS_LIVE_GROUPS })],
      ['an atoms message with string groups', { type: 'atoms', groups: 'x' }],
      ['an atoms message with an outcome outside the four', { type: 'atoms', groups: SKIPPED_STATES }],
      ['a graph with string tasks', stateMessageOf({ ...HOST_GRAPH_STUB, tasks: 'x' })],
      ['a graph with a null task', stateMessageOf({ ...HOST_GRAPH_STUB, tasks: [null] })],
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
      ['a showTasks message with no taskIds', { type: 'showTasks' }],
      ['a showPackage message with no name', { type: 'showPackage' }],
      ['a showPackage message with a numeric name', { type: 'showPackage', name: 7 }]
    ])('WHEN it is %s THEN it is rejected', (_name, raw) => {
      const isMessage = isGraphHostMessage(raw);

      expect(isMessage).toBe(false);
    });
  });
});
