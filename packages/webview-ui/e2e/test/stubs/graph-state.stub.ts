import type { GraphEdge, GraphState, Position, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type { PackageGraphState } from '../../common/graph.type.ts';

const WEB_CENTRE: Position = { x: 300, y: 0 };

const UI_CENTRE: Position = { x: 200, y: 100 };

const DATA_CENTRE: Position = { x: 400, y: 100 };

const CORE_CENTRE: Position = { x: 300, y: 200 };

const CONFIG_CENTRE: Position = { x: 300, y: 300 };

const BASE_CENTRE: Position = { x: 300, y: 400 };

const DOCS_CENTRE: Position = { x: 600, y: 0 };

/** Node centres on a fixed grid; `docs` is the isolated package. */
export const DIAMOND_CHAIN_POSITIONS_STUB: Positions = {
  web: WEB_CENTRE,
  ui: UI_CENTRE,
  data: DATA_CENTRE,
  core: CORE_CENTRE,
  config: CONFIG_CENTRE,
  base: BASE_CENTRE,
  docs: DOCS_CENTRE
};

/** `source` is the dependent: web needs ui and data, both need core, then config, then base. `docs` stands alone. */
const DIAMOND_CHAIN_EDGES: GraphEdge[] = [
  { source: 'config', target: 'base' },
  { source: 'core', target: 'config' },
  { source: 'data', target: 'core' },
  { source: 'ui', target: 'core' },
  { source: 'web', target: 'data' },
  { source: 'web', target: 'ui' }
];

const GHOST_EDGE: GraphEdge = { source: 'web', target: 'ghost' };

const DANGLING_EDGES: GraphEdge[] = [...DIAMOND_CHAIN_EDGES, GHOST_EDGE];

export const DIAMOND_CHAIN_STUB: PackageGraphState = {
  kind: 'graph',
  hash: 'a1b2c3d4',
  packages: ['base', 'config', 'core', 'data', 'docs', 'ui', 'web'],
  edges: DIAMOND_CHAIN_EDGES,
  positions: null
};

export const DIAMOND_CHAIN_CACHED_STUB: PackageGraphState = { ...DIAMOND_CHAIN_STUB, positions: DIAMOND_CHAIN_POSITIONS_STUB };

export const EDITED_STUB: PackageGraphState = {
  ...DIAMOND_CHAIN_STUB,
  hash: 'e5f6a7b8',
  packages: [...DIAMOND_CHAIN_STUB.packages, 'cli'],
  positions: null
};

export const NO_EDGES_STUB: PackageGraphState = { ...DIAMOND_CHAIN_STUB, hash: 'c0ffee00', edges: [] };

/** A root `//` package, and an edge to `ghost`, which no package list names. */
export const MONOREPO_ROOT_STUB: PackageGraphState = {
  ...DIAMOND_CHAIN_STUB,
  hash: 'd00dfeed',
  packages: ['//', ...DIAMOND_CHAIN_STUB.packages],
  edges: DANGLING_EDGES
};

export const LOADING_STUB: GraphState = { kind: 'loading' };

export const ERROR_STUB: GraphState = { kind: 'error', message: 'turbo exited with code 1' };

export const SINGLE_PACKAGE_STUB: GraphState = { kind: 'singlePackage' };
