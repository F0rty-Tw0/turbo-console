import type { EdgeStates, NodeStates } from '../../common/graph.type.ts';
import { dimmedExcept } from '../utils/graph-states.spec.util.ts';

const GHOST_NAMES = ['wide', 'site', 'bridge', 'store'];

const GHOST_EDGE_KEYS = ['site>bridge', 'bridge>store', 'wide>bridge'];

const GHOST_LIT: NodeStates = { site: 'selected', store: 'selected', bridge: 'highlighted' };

const GHOST_EDGES_LIT: EdgeStates = { 'site>bridge': 'highlighted', 'bridge>store': 'highlighted' };

/** The trace `site → store` with `bridge` unticked: the ghost reads highlighted, `wide` dimmed. */
export const GHOST_NODES_STUB: NodeStates = dimmedExcept(GHOST_NAMES, GHOST_LIT);

export const GHOST_EDGES_STUB: EdgeStates = dimmedExcept(GHOST_EDGE_KEYS, GHOST_EDGES_LIT);
