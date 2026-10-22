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

const GRAPH = { kind: 'graph', hash: 'h', packages: PACKAGES, edges: EDGES, positions: null, folderPositions: null };

const CACHED_GRAPH = { ...GRAPH, positions: POSITIONS };

const WITHOUT_FOLDER_POSITIONS = { kind: 'graph', hash: 'h', packages: PACKAGES, edges: EDGES, positions: null };

const LOADING = { kind: 'loading' };

const ERROR = { kind: 'error', message: 'x' };

const SINGLE_PACKAGE = { kind: 'singlePackage' };

const stateMessageOf = (state: unknown): unknown => {
  const message = { type: 'state', state };

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
      ['a graph with no folderPositions key', stateMessageOf(WITHOUT_FOLDER_POSITIONS)]
    ])('WHEN it is %s THEN it is rejected', (_name, raw) => {
      const isMessage = isGraphHostMessage(raw);

      expect(isMessage).toBe(false);
    });
  });
});
