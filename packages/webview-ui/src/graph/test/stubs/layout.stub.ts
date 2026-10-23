import type { ElkNode } from 'elkjs/lib/elk-api.js';

import type { Position, Positions } from '../../../bridge/common/graph-state.type.ts';
import type { Viewport } from '../../common/graph-page.type.ts';

const APP: ElkNode = { id: 'app', width: 100, height: 32 };

const LAID_OUT_APP: ElkNode = { ...APP, x: 10, y: 20 };

const APP_CENTRE: Position = { x: 60, y: 36 };

const FALLBACK_APP: Position = { x: 1, y: 2 };

const ORIGIN: Position = { x: 0, y: 0 };

/** One 100 by 32 px package, `app`, and no edge. */
export const ELK_GRAPH_STUB: ElkNode = { id: 'root', children: [APP], edges: [] };

/** `ELK_GRAPH_STUB` with `app`'s top-left corner at (10, 20). */
export const LAID_OUT_STUB: ElkNode = { id: 'root', children: [LAID_OUT_APP], edges: [] };

/** The centres of `LAID_OUT_STUB`. */
export const CENTRES_STUB: Positions = { app: APP_CENTRE };

export const FALLBACK_POSITIONS_STUB: Positions = { app: FALLBACK_APP };

/** The camera at zoom 1, not panned. */
export const HOME_CAMERA_STUB: Viewport = { zoom: 1, pan: ORIGIN };
