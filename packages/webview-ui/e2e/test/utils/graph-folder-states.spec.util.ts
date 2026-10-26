import { boardsState } from './graph-boards.spec.util.ts';
import { packageOf } from './graph-package.spec.util.ts';
import { positionsOf } from './graph-positions.spec.util.ts';
import { groupedSavedState } from './graph-saved-state.spec.util.ts';
import type { GraphEdge, GraphPackage, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import { freshViewStateOf } from '../../../src/graph/utils/fresh-view-state.util.ts';
import type { PositionRow } from '../../common/graph.type.ts';

/** `boardsState()` with a grouped layout cached at fixed centres, so geometry never depends on ELK. */
export const placedBoardsState = (): GraphReady => {
  const base = boardsState();
  const folderPositions = positionsOf([
    ['docs', 0, 0],
    ['web', 200, 0],
    ['@acme/config', 0, 300],
    ['@acme/ui', 200, 300],
    ['@acme/utils', 400, 300]
  ]);
  const state: GraphReady = { ...base, folderPositions };

  return state;
};

/** A saved grouped view of `hash` with exactly these folders collapsed. */
export const collapsedSavedState = (hash: string, collapsed: string[]): GraphViewState => {
  const grouped = groupedSavedState(hash);
  const state: GraphViewState = { ...grouped, collapsed };

  return state;
};

/** `a` in `x`, `m` in `mid` and `b` in `y`, linked a to m to b, so a trace from `a` to `b` can run through `m`. */
export const ghostFolderState = (): GraphReady => {
  const edges: GraphEdge[] = [
    { source: 'a', target: 'm' },
    { source: 'm', target: 'b' }
  ];
  const state: GraphReady = {
    kind: 'graph',
    tasks: [],
    hash: 'f01d0001',
    packages: [packageOf('a', 'x/a'), packageOf('m', 'mid/m'), packageOf('b', 'y/b')],
    edges,
    positions: null,
    folderPositions: positionsOf([
      ['a', 0, 0],
      ['m', 0, 200],
      ['b', 0, 400]
    ]),
    atomGroups: []
  };

  return state;
};

/** A root package, a real `(root)` folder, a `__proto__` folder and a package named `constructor`, on a 2 x 2 grid. */
export const awkwardNamesState = (): GraphReady => {
  const edges: GraphEdge[] = [
    { source: 'solo', target: 'x' },
    { source: 'constructor', target: 'a' },
    { source: 'x', target: 'a' }
  ];
  const state: GraphReady = {
    kind: 'graph',
    tasks: [],
    hash: 'f01d0002',
    packages: [
      packageOf('solo', 'solo'),
      packageOf('x', '(root)/x'),
      packageOf('a', '__proto__/a'),
      packageOf('constructor', 'tools/constructor')
    ],
    edges,
    positions: null,
    folderPositions: positionsOf([
      ['solo', 0, 0],
      ['x', 300, 0],
      ['a', 0, 300],
      ['constructor', 300, 300]
    ]),
    atomGroups: []
  };

  return state;
};

/** A saved flat view of `hash` with exactly these folders collapsed, so Group by folder collapses them on arrival. */
export const flatCollapsedSavedState = (hash: string, collapsed: string[]): GraphViewState => {
  const fresh = freshViewStateOf(hash);
  const state: GraphViewState = { ...fresh, collapsed };

  return state;
};

/** `a`, `m` and `b`, each alone in its folder, in one wide row: the fit is as wide as the row, so a node wider than its box shows. */
export const wideRowFolderState = (): GraphReady => {
  const state: GraphReady = {
    kind: 'graph',
    tasks: [],
    hash: 'f01d0003',
    packages: [packageOf('a', 'x/a'), packageOf('m', 'mid/m'), packageOf('b', 'y/b')],
    edges: [],
    positions: positionsOf([
      ['a', 0, 0],
      ['m', 400, 0],
      ['b', 800, 0]
    ]),
    folderPositions: positionsOf([
      ['a', 0, 0],
      ['m', 400, 0],
      ['b', 800, 0]
    ]),
    atomGroups: []
  };

  return state;
};

/** The folder of this title, alone in the graph with one package, so its box is as narrow as a box gets and cuts the title. */
export const LONG_FOLDER = 'a-very-long-folder-name-for-the-ellipsis-check';

/** One package in `LONG_FOLDER`, placed at the origin. */
export const longTitleState = (): GraphReady => {
  const state: GraphReady = {
    kind: 'graph',
    tasks: [],
    hash: 'f01d0005',
    packages: [packageOf('pkg', `${LONG_FOLDER}/pkg`)],
    edges: [],
    positions: null,
    folderPositions: positionsOf([['pkg', 0, 0]]),
    atomGroups: []
  };

  return state;
};

/** The packages `d01` to `d12` of the folder `deep`. */
const DEEP_NAMES = Array.from({ length: 12 }, (_, index): string => `d${String(index + 1).padStart(2, '0')}`);

/** Vertical gap between two packages of the `deep` column, in graph units. */
const DEEP_ROW_GAP = 120;

const deepRowOf = (name: string, index: number): PositionRow => [name, 0, index * DEEP_ROW_GAP];

/** One folder `deep` of 12 packages in a single column, so its box is narrow and its count has 2 digits. */
export const deepFolderState = (): GraphReady => {
  const state: GraphReady = {
    kind: 'graph',
    tasks: [],
    hash: 'f01d0006',
    packages: DEEP_NAMES.map((name): GraphPackage => packageOf(name, `deep/${name}`)),
    edges: [],
    positions: null,
    folderPositions: positionsOf(DEEP_NAMES.map(deepRowOf)),
    atomGroups: []
  };

  return state;
};
