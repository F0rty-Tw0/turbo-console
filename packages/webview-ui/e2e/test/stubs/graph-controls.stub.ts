import type { GraphEdge, GraphPackage, GraphReady, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import { gridPositionsOf } from '../utils/graph-controls.spec.util.ts';
import { packageOf } from '../utils/graph-package.spec.util.ts';

/** Node centres on a fixed grid, one per package of `CONTROLS_STUB`. */
export const CONTROLS_POSITIONS_STUB: Positions = gridPositionsOf(['admin', 'base', 'config', 'core', 'data', 'docs', 'ui', 'web']);

/** `source` is the dependent: web needs data and ui, admin needs ui, ui and data need core, then config, then base. */
const CONTROLS_EDGES: GraphEdge[] = [
  { source: 'config', target: 'base' },
  { source: 'core', target: 'config' },
  { source: 'data', target: 'core' },
  { source: 'ui', target: 'core' },
  { source: 'web', target: 'data' },
  { source: 'web', target: 'ui' },
  { source: 'admin', target: 'ui' }
];

const CONTROLS_PACKAGES: GraphPackage[] = [
  packageOf('docs', ''),
  packageOf('admin', 'apps/admin', ['app']),
  packageOf('web', 'apps/web', ['app', 'ui']),
  packageOf('base', 'packages/base', ['lib']),
  packageOf('config', 'packages/config', ['lib']),
  packageOf('core', 'packages/core', ['lib']),
  packageOf('data', 'packages/data', ['lib']),
  packageOf('ui', 'packages/ui', ['ui'])
];

/** Three folder groups: the root `docs`, `apps` (admin, web) and `packages` (base, config, core, data, ui); tags app, lib, ui. */
export const CONTROLS_STUB: GraphReady = {
  kind: 'graph',
  hash: 'c0a1b2c3',
  packages: CONTROLS_PACKAGES,
  edges: CONTROLS_EDGES,
  positions: null,
  folderPositions: null,
  tasks: [],
  atomGroups: []
};

export const CONTROLS_CACHED_STUB: GraphReady = { ...CONTROLS_STUB, positions: CONTROLS_POSITIONS_STUB };

const EDITED_POSITIONS: Positions = gridPositionsOf(['admin', 'base', 'cli', 'config', 'core', 'data', 'ui', 'web']);

const KEPT_PACKAGES: GraphPackage[] = CONTROLS_PACKAGES.filter((pkg): boolean => pkg.name !== 'docs');

const EDITED_PACKAGES: GraphPackage[] = [...KEPT_PACKAGES, packageOf('cli', 'tools/cli')];

/** The controls graph edited: `docs` removed and `cli` at `tools/cli` added, under another hash. */
export const CONTROLS_EDITED_STUB: GraphReady = {
  ...CONTROLS_CACHED_STUB,
  hash: 'c4d5e6f7',
  packages: EDITED_PACKAGES,
  positions: EDITED_POSITIONS
};

const PROTO_PACKAGES: GraphPackage[] = [
  packageOf('__proto__', 'packages/__proto__', ['constructor']),
  packageOf('constructor', 'packages/constructor', ['__proto__', 'constructor']),
  packageOf('app', 'apps/app')
];

const PROTO_EDGES: GraphEdge[] = [
  { source: 'app', target: 'constructor' },
  { source: 'constructor', target: '__proto__' }
];

const PROTO_POSITIONS: Positions = gridPositionsOf(['app', 'constructor', '__proto__']);

/** Packages and tags named like `Object` members, cached: no filter, group or tag may resolve to an inherited member. */
export const PROTO_CONTROLS_STUB: GraphReady = {
  kind: 'graph',
  hash: 'f1f1f1f1',
  packages: PROTO_PACKAGES,
  edges: PROTO_EDGES,
  positions: PROTO_POSITIONS,
  folderPositions: null,
  tasks: [],
  atomGroups: []
};
