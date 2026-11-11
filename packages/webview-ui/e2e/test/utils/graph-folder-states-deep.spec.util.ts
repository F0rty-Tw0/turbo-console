import { packageOf } from './graph-package.spec.util.ts';
import { positionsOf } from './graph-positions.spec.util.ts';
import type { GraphPackage, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';
import type { PositionRow } from '../../common/graph.type.ts';

/** The packages `d01` to `d12` of the folder `deep`. */
const DEEP_NAMES = Array.from({ length: 12 }, (_, index): string => `d${String(index + 1).padStart(2, '0')}`);

/** Vertical gap between two packages of the `deep` column, in graph units. */
const DEEP_ROW_GAP = 120;

const deepRowOf = (name: string, index: number): PositionRow => [name, 0, index * DEEP_ROW_GAP];

/** One folder `deep` of 12 packages in a single column, so its box is narrow and its count has 2 digits. */
export const deepFolderState = (): GraphReady => {
  const packages = DEEP_NAMES.map((name): GraphPackage => packageOf(name, `deep/${name}`));
  const folderPositions = positionsOf(DEEP_NAMES.map(deepRowOf));
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    scopeShown: true,
    scriptsShown: true,
    predictionShown: false,
    affectedShown: false,
    tasks: [],
    hash: 'f01d0006',
    packages,
    edges: [],
    positions: null,
    routes: null,
    folderRoutes: null,
    folderPositions,
    atomGroups: []
  };

  return state;
};
