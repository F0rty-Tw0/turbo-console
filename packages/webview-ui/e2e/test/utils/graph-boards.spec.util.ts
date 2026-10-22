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
    folderPositions: null
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
