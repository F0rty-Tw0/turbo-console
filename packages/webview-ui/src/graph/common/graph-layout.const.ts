import type { ElkLayering, ElkOptions } from './layout.type.ts';

/** The layout algorithm's version: it enters the layout hash, so a change to how routes or positions are built drops every cached layout. */
export const LAYOUT_VERSION = 3;

/** An edge route with more bends than this is not a route: the page leaves it out of its post and the host drops it alone. */
export const ROUTE_BENDS_MAX = 64;

/** The class of an edge drawn on its ELK route: `round-segments` from its `segWeights`/`segDistances`/`srcEnd`/`tgtEnd` data. */
export const ROUTED_CLASS = 'routed';

/** How round a routed edge's corners are, in px. */
export const ROUTE_RADIUS_PX = 6;

/**
 * Layered, top-down; the cheapest placement and routing, because a package graph needs a readable layout, not an optimal one.
 * `edgeCoords: ROOT` makes every edge route come back in root coordinates, whatever compound it sits in. It holds no layering
 * strategy and no thoroughness: both are per view (`layeredOptionsOf`).
 */
export const ELK_OPTIONS: ElkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.edgeRouting': 'POLYLINE',
  'elk.json.edgeCoords': 'ROOT'
};

/**
 * The most leaves a graph may have and still be laid out at thoroughness 7; above it, 1 keeps the layout fast. 150 missed the
 * 2 s first-frame budget on the ubuntu runner (2269 ms, PR #227 run 41765288256), so the cap is 100.
 */
export const ELK_THOROUGH_MAX_LEAVES = 100;

/** The layering of package views and flat task views. */
export const LAYERING_DEFAULT: ElkLayering = 'NETWORK_SIMPLEX';

/** The layering of the grouped task view: NETWORK_SIMPLEX raised the grouped U0 task view from 399 to 449 crossings (U6c Task 3.1); LONGEST_PATH is the pre-U6c layering there. */
export const LAYERING_GROUPED_TASKS: ElkLayering = 'LONGEST_PATH';

/** The gap between packed components, in px. */
export const PACK_SPACING_PX = 48;

/** The width over height the packed components aim for: 1 is square. */
export const PACK_ASPECT = 1;

/** The clear gap between a folder link's label box and its line, in px. */
export const LABEL_GAP_PX = 4;
