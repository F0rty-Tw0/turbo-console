import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import type { ControlsFields, DetailsFields, PackageFacts } from '../../common/graph.type.ts';

const ORIGIN = { x: 0, y: 0 };

/** The seven controls fields of a page that has never saved them. */
export const DEFAULT_CONTROLS_STUB: ControlsFields = {
  controlsOpen: true,
  search: '',
  depth: 1,
  hidden: [],
  focus: null,
  tags: [],
  grouped: false
};

/** The details fields of a page that has never saved them: open, with no link or trace. */
export const DEFAULT_DETAILS_STUB: DetailsFields = { detailsOpen: true, link: null, trace: null };

/** A valid saved view for `DETAILS_STUB`: fitted camera at rest, nothing selected, every field at its default. */
export const SAVED_BASE_STUB: GraphViewState = {
  hash: 'd3a11001',
  zoom: 1,
  pan: ORIGIN,
  selected: null,
  ...DEFAULT_CONTROLS_STUB,
  ...DEFAULT_DETAILS_STUB,
  collapsed: []
};

export const WEB_FACTS_STUB: PackageFacts = { path: 'apps/web', tags: ['app', 'ui'], button: 'View Package Details · 5 tasks' };

/** `web` after `DETAILS_RECOUNT_STUB`. */
export const WEB_RECOUNT_FACTS_STUB: PackageFacts = { ...WEB_FACTS_STUB, button: 'View Package Details · 6 tasks' };

export const WEB_STATUS_STUB: string = 'web · 5 dependencies, 2 direct · 1 dependent, 1 direct';
