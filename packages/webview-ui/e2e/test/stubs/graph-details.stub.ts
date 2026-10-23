import type { GraphEdge, GraphPackage, GraphReady, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type { InputOptionColors, PositionRow } from '../../common/graph.type.ts';
import { packageOf } from '../utils/graph-package.spec.util.ts';
import { positionsOf } from '../utils/graph-positions.spec.util.ts';

const DETAILS_PACKAGES: GraphPackage[] = [
  packageOf('docs', '', [], 0),
  packageOf('admin', 'apps/admin', ['app'], 2),
  packageOf('web', 'apps/web', ['app', 'ui'], 5),
  packageOf('base', 'packages/base', ['lib'], 1),
  packageOf('config', 'packages/config', ['lib'], 3),
  packageOf('core', 'packages/core', ['lib'], 4),
  packageOf('data', 'packages/data', ['lib'], 2),
  packageOf('ui', 'packages/ui', ['ui'], 1),
  packageOf('solo', 'tools/solo', [], 0)
];

/** `source` is the dependent: docs needs web; web needs data and ui; admin needs ui; ui and data need core, then config, then base. */
const DETAILS_EDGES: GraphEdge[] = [
  { source: 'config', target: 'base' },
  { source: 'core', target: 'config' },
  { source: 'data', target: 'core' },
  { source: 'ui', target: 'core' },
  { source: 'web', target: 'data' },
  { source: 'web', target: 'ui' },
  { source: 'admin', target: 'ui' },
  { source: 'docs', target: 'web' }
];

const ADMIN_ROW: PositionRow = ['admin', 100, 0];

const WEB_ROW: PositionRow = ['web', 350, 0];

const DOCS_ROW: PositionRow = ['docs', 700, 0];

const UI_ROW: PositionRow = ['ui', 150, 150];

const DATA_ROW: PositionRow = ['data', 450, 150];

const CORE_ROW: PositionRow = ['core', 300, 300];

const CONFIG_ROW: PositionRow = ['config', 300, 450];

const BASE_ROW: PositionRow = ['base', 300, 600];

const SOLO_ROW: PositionRow = ['solo', 700, 300];

const KEPT_ROWS: PositionRow[] = [ADMIN_ROW, WEB_ROW, DOCS_ROW, UI_ROW, DATA_ROW, CORE_ROW, CONFIG_ROW, BASE_ROW];

/** No node sits on another's edge, and every edge midpoint is clear of every node box. */
export const DETAILS_POSITIONS_STUB: Positions = positionsOf([...KEPT_ROWS, SOLO_ROW]);

/** Nine packages in four folders, cached; tags app, lib, ui. */
export const DETAILS_STUB: GraphReady = {
  kind: 'graph',
  hash: 'd3a11001',
  packages: DETAILS_PACKAGES,
  edges: DETAILS_EDGES,
  positions: DETAILS_POSITIONS_STUB,
  folderPositions: null,
  tasks: []
};

const RECOUNTED_PACKAGES: GraphPackage[] = [
  packageOf('docs', '', [], 0),
  packageOf('admin', 'apps/admin', ['app'], 2),
  packageOf('web', 'apps/web', ['app', 'ui'], 6),
  packageOf('base', 'packages/base', ['lib'], 1),
  packageOf('config', 'packages/config', ['lib'], 3),
  packageOf('core', 'packages/core', ['lib'], 4),
  packageOf('data', 'packages/data', ['lib'], 2),
  packageOf('ui', 'packages/ui', ['ui'], 2),
  packageOf('solo', 'tools/solo', [], 0)
];

/** The details graph under the same hash with `web` at 6 tasks and `ui` at 2: only the task counts differ. */
export const DETAILS_RECOUNT_STUB: GraphReady = { ...DETAILS_STUB, packages: RECOUNTED_PACKAGES };

const EDITED_PACKAGES: GraphPackage[] = DETAILS_PACKAGES.filter((pkg): boolean => pkg.name !== 'solo');

const DATA_TO_BASE: GraphEdge = { source: 'data', target: 'base' };

const EDITED_EDGES: GraphEdge[] = [...DETAILS_EDGES, DATA_TO_BASE];

const EDITED_POSITIONS: Positions = positionsOf(KEPT_ROWS);

/** The details graph edited: `solo` removed and the edge `data>base` added, under another hash; `web → base` is 3 packages. */
export const DETAILS_EDITED_STUB: GraphReady = {
  ...DETAILS_STUB,
  hash: 'd3a11002',
  packages: EDITED_PACKAGES,
  edges: EDITED_EDGES,
  positions: EDITED_POSITIONS
};

/** Every package of `DETAILS_STUB`, sorted. */
export const DETAILS_NAMES_STUB: string[] = ['admin', 'base', 'config', 'core', 'data', 'docs', 'solo', 'ui', 'web'];

/** Colours the stub theme lacks, so a pressed toggle drawn in them can only come from the page's own rule. */
export const INPUT_OPTION_STUB: InputOptionColors = {
  background: 'rgb(12, 34, 56)',
  border: 'rgb(78, 90, 12)',
  foreground: 'rgb(200, 100, 50)'
};
