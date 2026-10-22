import { DETAILS_NAMES_STUB } from './graph-details.stub.ts';
import type { EdgeStates, NodeStates } from '../../common/graph.type.ts';
import { dimmedExcept } from '../utils/graph-states.spec.util.ts';

const EDGE_KEYS = ['config>base', 'core>config', 'data>core', 'ui>core', 'web>data', 'web>ui', 'admin>ui', 'docs>web'];

const PICKING_LIT: NodeStates = {
  web: 'selected',
  data: 'highlighted',
  ui: 'highlighted',
  core: 'highlighted',
  config: 'highlighted',
  base: 'highlighted',
  docs: 'highlighted'
};

const CO_LIT: NodeStates = { web: 'selected', core: 'highlighted', config: 'highlighted' };

const COR_LIT: NodeStates = { web: 'selected', core: 'highlighted' };

const START_LIT: NodeStates = { web: 'selected' };

const FOCUS_UI_LIT: NodeStates = { web: 'selected', ui: 'highlighted', core: 'highlighted' };

const NO_PATH_LIT: NodeStates = { web: 'selected', solo: 'selected' };

const TRACE_LIT: NodeStates = { web: 'selected', core: 'selected', data: 'highlighted' };

const TRACE_EDGES_LIT: EdgeStates = { 'web>data': 'highlighted', 'data>core': 'highlighted' };

/** Picking from `web` on `DETAILS_STUB`: every candidate lit, the two with no path dimmed. */
export const PICKING_NODES_STUB: NodeStates = dimmedExcept(DETAILS_NAMES_STUB, PICKING_LIT);

/** All eight links of `DETAILS_STUB` dimmed: picking, a trace with no path, and the filtered picking canvases. */
export const DIMMED_EDGES_STUB: EdgeStates = dimmedExcept(EDGE_KEYS, {});

/** The filter `co` leaves `core` and `config` of the forward group lit. */
export const FILTER_CO_NODES_STUB: NodeStates = dimmedExcept(DETAILS_NAMES_STUB, CO_LIT);

export const FILTER_COR_NODES_STUB: NodeStates = dimmedExcept(DETAILS_NAMES_STUB, COR_LIT);

/** Only the start selected: no candidate left lit. */
export const START_ONLY_NODES_STUB: NodeStates = dimmedExcept(DETAILS_NAMES_STUB, START_LIT);

/** The trace `web → solo` has no path: both ends selected, the rest dimmed. */
export const NO_PATH_NODES_STUB: NodeStates = dimmedExcept(DETAILS_NAMES_STUB, NO_PATH_LIT);

/** The trace `web → core` runs through `data`. */
export const TRACE_WEB_CORE_NODES_STUB: NodeStates = dimmedExcept(DETAILS_NAMES_STUB, TRACE_LIT);

export const TRACE_WEB_CORE_EDGES_STUB: EdgeStates = dimmedExcept(EDGE_KEYS, TRACE_EDGES_LIT);

/** Picking from `web` with `ui` focused: only the candidates still shown, `ui` and `core`, are lit. */
export const FOCUS_UI_PICKING_NODES_STUB: NodeStates = dimmedExcept(DETAILS_NAMES_STUB, FOCUS_UI_LIT);
