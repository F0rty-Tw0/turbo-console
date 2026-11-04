import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import { elkEdgeOf } from '../../utils/elk-grouped-graph.util.ts';

const LEAF_SIZE = { width: 80, height: 32 };

const LEAF_A: ElkNode = { id: 'a', ...LEAF_SIZE };

const LEAF_B: ElkNode = { id: 'b', ...LEAF_SIZE };

const LEAF_C: ElkNode = { id: 'c', ...LEAF_SIZE };

const LEAF_D: ElkNode = { id: 'd', ...LEAF_SIZE };

const ROOT_EDGE = elkEdgeOf({ source: 'c', target: 'd' });

const WRAPPER_EDGE = elkEdgeOf({ source: 'b', target: 'c' });

const FOLDER_EDGE = elkEdgeOf({ source: 'a', target: 'b' });

const FOLDER: ElkNode = { id: 'folder', children: [LEAF_A, LEAF_B], edges: [FOLDER_EDGE] };

const FIRST_WRAPPER: ElkNode = { id: 'wrapper0', children: [FOLDER, LEAF_C], edges: [WRAPPER_EDGE] };

const SECOND_WRAPPER: ElkNode = { id: 'wrapper1', children: [LEAF_D] };

/** A packed graph: two wrappers; one edge at the root, one in the first wrapper, one inside the folder of that wrapper. */
export const PACKED_GRAPH_STUB: ElkNode = { id: 'root', children: [FIRST_WRAPPER, SECOND_WRAPPER], edges: [ROOT_EDGE] };

/** The edges of `PACKED_GRAPH_STUB` in flattened order: root first, then depth-first. */
export const PACKED_EDGES_STUB: ElkEdge[] = [ROOT_EDGE, WRAPPER_EDGE, FOLDER_EDGE];
