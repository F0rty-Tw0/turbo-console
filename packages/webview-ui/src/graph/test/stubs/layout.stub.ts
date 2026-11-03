import type { ElkEdge, ElkEdgeSection, ElkNode } from 'elkjs/lib/elk-api.js';

import type { EdgeRoute, Position, Positions, Routes } from '../../../bridge/common/graph-state.type.ts';
import type { Viewport } from '../../common/graph-page.type.ts';
import { edgeIdOf } from '../../utils/edge-id.util.ts';

const APP: ElkNode = { id: 'app', width: 100, height: 32 };

const LAID_OUT_APP: ElkNode = { ...APP, x: 10, y: 20 };

const APP_CENTRE: Position = { x: 60, y: 36 };

const FALLBACK_APP: Position = { x: 1, y: 2 };

const ORIGIN: Position = { x: 0, y: 0 };

const LAID_OUT_LIB: ElkNode = { id: 'lib', width: 100, height: 32, x: 10, y: 120 };

const EDGE_ID_STUB: string = edgeIdOf({ source: 'app', target: 'lib' });

const ROUTE_START: Position = { x: 60, y: 52 };

const ROUTE_BEND: Position = { x: 60, y: 86 };

const ROUTE_END: Position = { x: 60, y: 120 };

const ROUTE_SECTION: ElkEdgeSection = {
  id: 's0',
  startPoint: ROUTE_START,
  bendPoints: [ROUTE_BEND],
  endPoint: ROUTE_END
};

const ROUTED_EDGE: ElkEdge = { id: EDGE_ID_STUB, sources: ['app'], targets: ['lib'], sections: [ROUTE_SECTION] };

const APP_LIB_ROUTE: EdgeRoute = { start: ROUTE_START, bends: [ROUTE_BEND], end: ROUTE_END };

/** One 100 by 32 px package, `app`, and no edge. */
export const ELK_GRAPH_STUB: ElkNode = { id: 'root', children: [APP], edges: [] };

/** `ELK_GRAPH_STUB` with `app`'s top-left corner at (10, 20). */
export const LAID_OUT_STUB: ElkNode = { id: 'root', children: [LAID_OUT_APP], edges: [] };

/** `LAID_OUT_STUB` plus package `lib` at (10, 120) and one routed edge app > lib with a single bend. */
export const ROUTED_ELK_STUB: ElkNode = { id: 'root', children: [LAID_OUT_APP, LAID_OUT_LIB], edges: [ROUTED_EDGE] };

/** The route of `ROUTED_ELK_STUB`'s edge, under that edge's id. */
export const ROUTES_STUB: Routes = { [EDGE_ID_STUB]: APP_LIB_ROUTE };

/** The centres of `LAID_OUT_STUB`. */
export const CENTRES_STUB: Positions = { app: APP_CENTRE };

export const FALLBACK_POSITIONS_STUB: Positions = { app: FALLBACK_APP };

/** The camera at zoom 1, not panned. */
export const HOME_CAMERA_STUB: Viewport = { zoom: 1, pan: ORIGIN };
