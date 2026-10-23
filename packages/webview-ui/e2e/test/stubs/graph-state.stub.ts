import type { GraphEdge, GraphReady, GraphState, Position, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import { packageOf, packagesOf } from '../utils/graph-package.spec.util.ts';

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

export const DIAMOND_CHAIN_STUB: GraphReady = {
  kind: 'graph',
  hash: 'a1b2c3d4',
  packages: packagesOf(['base', 'config', 'core', 'data', 'docs', 'ui', 'web']),
  edges: DIAMOND_CHAIN_EDGES,
  positions: null,
  folderPositions: null,
  tasks: []
};

export const DIAMOND_CHAIN_CACHED_STUB: GraphReady = { ...DIAMOND_CHAIN_STUB, positions: DIAMOND_CHAIN_POSITIONS_STUB };

export const EDITED_STUB: GraphReady = {
  ...DIAMOND_CHAIN_STUB,
  hash: 'e5f6a7b8',
  packages: [...DIAMOND_CHAIN_STUB.packages, packageOf('cli')],
  positions: null
};

export const NO_EDGES_STUB: GraphReady = { ...DIAMOND_CHAIN_STUB, hash: 'c0ffee00', edges: [] };

/** A root `//` package, and an edge to `ghost`, which no package list names. */
export const MONOREPO_ROOT_STUB: GraphReady = {
  ...DIAMOND_CHAIN_STUB,
  hash: 'd00dfeed',
  packages: [packageOf('//', ''), ...DIAMOND_CHAIN_STUB.packages],
  edges: DANGLING_EDGES
};

/** The diamond, cached, under another hash: a state that differs from `DIAMOND_CHAIN_STUB` only by hash and positions. */
export const OTHER_HASH_CACHED_STUB: GraphReady = { ...DIAMOND_CHAIN_CACHED_STUB, hash: 'beefbeef' };

/** The diamond plus a package named `constructor`, with cached positions that leave it out. */
export const CONSTRUCTOR_UNCACHED_STUB: GraphReady = {
  ...DIAMOND_CHAIN_CACHED_STUB,
  hash: 'c0c0c0c0',
  packages: [...DIAMOND_CHAIN_STUB.packages, packageOf('constructor')]
};

const OBJECT_MEMBER_EDGES: GraphEdge[] = [
  { source: 'app', target: 'constructor' },
  { source: 'constructor', target: '__proto__' },
  { source: 'toString', target: '__proto__' }
];

/** Packages named like `Object` members, laid out by ELK: no position may resolve to an inherited member. */
export const OBJECT_MEMBER_NAMES_STUB: GraphReady = {
  kind: 'graph',
  hash: 'f00dface',
  packages: packagesOf(['__proto__', 'app', 'constructor', 'toString']),
  edges: OBJECT_MEMBER_EDGES,
  positions: null,
  folderPositions: null,
  tasks: []
};

const ARROW_NAME_EDGES: GraphEdge[] = [
  { source: 'a', target: 'b' },
  { source: 'a>b', target: 'c' },
  { source: 'a', target: 'b>c' }
];

/** Package names that hold `>`: an edge id built as `source>target` would be a package name, or another edge's id. */
export const ARROW_NAMES_STUB: GraphReady = {
  kind: 'graph',
  hash: 'a0b0c0d0',
  packages: packagesOf(['a', 'a>b', 'b', 'b>c', 'c']),
  edges: ARROW_NAME_EDGES,
  positions: null,
  folderPositions: null,
  tasks: []
};

export const LOADING_STUB: GraphState = { kind: 'loading' };

export const ERROR_STUB: GraphState = { kind: 'error', message: 'turbo exited with code 1' };

export const SINGLE_PACKAGE_STUB: GraphState = { kind: 'singlePackage' };
