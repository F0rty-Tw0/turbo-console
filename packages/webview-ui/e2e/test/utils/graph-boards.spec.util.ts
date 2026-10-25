import { packageOf } from './graph-package.spec.util.ts';
import { positionsOf } from './graph-positions.spec.util.ts';
import type { GraphEdge, GraphPackage, GraphReady, Positions } from '../../../src/bridge/common/graph-state.type.ts';

/** The folders of the boards graph. */
export const BOARD_FOLDER_KEYS = ['apps', 'packages'];

/** The packages of the boards graph's `packages` folder. */
export const PACKAGES_FOLDER_MEMBERS = ['@acme/config', '@acme/ui', '@acme/utils'];

const BOARDS_EDGES: GraphEdge[] = [
  { source: 'web', target: '@acme/ui' },
  { source: 'docs', target: '@acme/ui' },
  { source: 'docs', target: '@acme/utils' },
  { source: '@acme/ui', target: '@acme/utils' }
];

/** Five fixed centres that interleave the two folders, so a grouped layout has to pull them apart. */
export const BOARDS_FLAT_POSITIONS: Positions = positionsOf([
  ['docs', 0, 0],
  ['@acme/ui', 150, 0],
  ['web', 300, 0],
  ['@acme/utils', 150, 150],
  ['@acme/config', 450, 150]
]);

/** The boards laid out grouped, for a test that needs to know which side of its box a package sits on: `@acme/config` is leftmost. */
export const BOARDS_FOLDER_POSITIONS: Positions = positionsOf([
  ['docs', 0, 0],
  ['web', 250, 0],
  ['@acme/config', 0, 300],
  ['@acme/ui', 250, 300],
  ['@acme/utils', 500, 300]
]);

const BOARDS_TAGS: ReadonlyMap<string, string[]> = new Map([
  ['web', ['ui']],
  ['@acme/ui', ['ui']],
  ['@acme/utils', ['ui']],
  ['docs', ['docs']],
  ['@acme/config', ['config']]
]);

/** `apps/docs`, `apps/web`, `packages/config`, `packages/ui` and `packages/utils`, with no tags and no cached layout. */
export const boardsState = (): GraphReady => {
  const packages: GraphPackage[] = [
    packageOf('docs', 'apps/docs'),
    packageOf('web', 'apps/web'),
    packageOf('@acme/config', 'packages/config'),
    packageOf('@acme/ui', 'packages/ui'),
    packageOf('@acme/utils', 'packages/utils')
  ];
  const state: GraphReady = {
    kind: 'graph',
    hash: 'b0a2d500',
    packages,
    edges: BOARDS_EDGES,
    positions: null,
    folderPositions: null,
    tasks: [],
    atomGroups: []
  };

  return state;
};

/** `boardsState()` with the flat layout cached and each package's tags set, the filters' fixture. */
export const taggedBoardsState = (): GraphReady => {
  const base = boardsState();
  const taggedOf = (info: GraphPackage): GraphPackage => packageOf(info.name, info.path, BOARDS_TAGS.get(info.name) ?? []);
  const state: GraphReady = { ...base, packages: base.packages.map(taggedOf), positions: BOARDS_FLAT_POSITIONS };

  return state;
};

/** `boardsState()` with its flat layout cached: the start of every test that switches modes without waiting for ELK. */
export const cachedBoardsState = (): GraphReady => {
  const base = boardsState();
  const state: GraphReady = { ...base, positions: BOARDS_FLAT_POSITIONS };

  return state;
};

/** `cachedBoardsState()` with the grouped layout cached too. */
export const bothCachedBoardsState = (): GraphReady => {
  const base = cachedBoardsState();
  const state: GraphReady = { ...base, folderPositions: BOARDS_FOLDER_POSITIONS };

  return state;
};

/** `r` in the root folder, `p` in a real `(root)` folder and `b` in `apps`, linked `p` to `r` and `b` to `p`, on fixed grouped centres. */
export const rootFoldersState = (): GraphReady => {
  const edges: GraphEdge[] = [
    { source: 'p', target: 'r' },
    { source: 'b', target: 'p' }
  ];
  const state: GraphReady = {
    kind: 'graph',
    tasks: [],
    hash: 'f01d0010',
    packages: [packageOf('r', 'r'), packageOf('p', '(root)/p'), packageOf('b', 'apps/b')],
    edges,
    positions: null,
    folderPositions: positionsOf([
      ['r', 0, 0],
      ['p', 200, 0],
      ['b', 100, 300]
    ]),
    atomGroups: []
  };

  return state;
};

/** `a` in a `__proto__` folder, `b` and a package named `constructor` in `x`, linked `b` to `a` and `constructor` to `b`. */
export const protoFolderState = (): GraphReady => {
  const edges: GraphEdge[] = [
    { source: 'b', target: 'a' },
    { source: 'constructor', target: 'b' }
  ];
  const state: GraphReady = {
    kind: 'graph',
    tasks: [],
    hash: 'f01d0011',
    packages: [packageOf('a', '__proto__/a'), packageOf('b', 'x/b'), packageOf('constructor', 'x/constructor')],
    edges,
    positions: null,
    folderPositions: positionsOf([
      ['a', 0, 0],
      ['b', 0, 300],
      ['constructor', 200, 300]
    ]),
    atomGroups: []
  };

  return state;
};

/** `a` and `c` in `f1`, `b` in `f2` and `d` in `f3`, linked `a` to `b`, `b` to `c` and `b` to `d`, on fixed grouped centres so no ELK run. */
export const threeFoldersState = (): GraphReady => {
  const edges: GraphEdge[] = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
    { source: 'b', target: 'd' }
  ];
  const state: GraphReady = {
    kind: 'graph',
    tasks: [],
    hash: 'f01d0012',
    packages: [packageOf('a', 'f1/a'), packageOf('c', 'f1/c'), packageOf('b', 'f2/b'), packageOf('d', 'f3/d')],
    edges,
    positions: null,
    folderPositions: positionsOf([
      ['a', 0, 0],
      ['c', 200, 0],
      ['b', 100, 300],
      ['d', 100, 600]
    ]),
    atomGroups: []
  };

  return state;
};
