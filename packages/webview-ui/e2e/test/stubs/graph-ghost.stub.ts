import type { GraphEdge, GraphPackage, GraphReady, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type { PositionRow } from '../../common/graph.type.ts';
import { packageOf } from '../utils/graph-package.spec.util.ts';
import { positionsOf } from '../utils/graph-positions.spec.util.ts';

const GHOST_PACKAGES: GraphPackage[] = [
  packageOf('wide', 'packages/wide', ['lib'], 0),
  packageOf('site', 'apps/site', ['app'], 1),
  packageOf('bridge', 'packages/bridge', ['lib'], 2),
  packageOf('store', 'apps/store', ['app'], 3)
];

/** `wide>bridge` is the edge off the shortest path `site → bridge → store` that touches the ghost. */
const GHOST_EDGES: GraphEdge[] = [
  { source: 'site', target: 'bridge' },
  { source: 'bridge', target: 'store' },
  { source: 'wide', target: 'bridge' }
];

const WIDE_ROW: PositionRow = ['wide', 0, 150];

const NEAR_ROWS: PositionRow[] = [WIDE_ROW, ['site', 300, 0], ['bridge', 300, 150], ['store', 300, 300]];

const GHOST_POSITIONS: Positions = positionsOf(NEAR_ROWS);

/** A trace `site → store` runs through `bridge`; unticking `bridge` makes it a ghost. */
export const GHOST_STUB: GraphReady = {
  kind: 'graph',
  hash: '9a05a001',
  packages: GHOST_PACKAGES,
  edges: GHOST_EDGES,
  positions: GHOST_POSITIONS,
  folderPositions: null,
  tasks: [],
  atomGroups: []
};

const FAR_ROWS: PositionRow[] = [WIDE_ROW, ['site', 700, 0], ['bridge', 1100, 150], ['store', 700, 300]];

const GHOST_FAR_POSITIONS: Positions = positionsOf(FAR_ROWS);

/** `bridge` lies outside the box that `wide`, `site` and `store` span, so a Fit that frames the ghost changes the zoom. */
export const GHOST_FAR_STUB: GraphReady = { ...GHOST_STUB, hash: '9a05a002', positions: GHOST_FAR_POSITIONS };
