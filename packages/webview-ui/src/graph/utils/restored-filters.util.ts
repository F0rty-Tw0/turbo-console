import { tagsOf } from './folder-group.util.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { RestoredControls } from '../common/graph-controls.type.ts';
import type { GraphFilters, GraphFocus } from '../common/graph-filters.type.ts';
import type { ControlsViewFields, DrawnGraph } from '../common/graph-page.type.ts';

const focusOf = (state: GraphViewState, known: Set<string>): GraphFocus | null => {
  const { focus, depth } = state;

  if (focus === null) return null;

  const isKnown = known.has(focus);

  if (!isKnown) return null;

  const restored: GraphFocus = { name: focus, depth };

  return restored;
};

/** The saved filters kept to what the drawn graph still has; the focused name leaves `hidden`; `depth` is taken as is. */
export const restoredFilters = (state: GraphViewState, graph: DrawnGraph): RestoredControls => {
  const known = new Set(graph.infos.map((info) => info.name));
  const knownTags = new Set(tagsOf(graph.infos));
  const focus = focusOf(state, known);
  const isKept = (name: string): boolean => known.has(name) && name !== focus?.name;
  const hidden = new Set(state.hidden.filter(isKept));
  const tags = new Set(state.tags.filter((tag) => knownTags.has(tag)));
  const filters: GraphFilters = { hidden, focus, tags };
  const restored: RestoredControls = {
    filters,
    search: state.search,
    depth: state.depth,
    isOpen: state.controlsOpen,
    isGrouped: state.grouped
  };

  return restored;
};

/** The controls part of the saved view state: the inverse of `restoredFilters`; the focus is saved by name only. */
export const controlsFieldsOf = (
  filters: GraphFilters,
  search: string,
  depth: number,
  isOpen: boolean,
  isGrouped: boolean
  // eslint-disable-next-line max-params -- five until `depth` moves into `GraphFilters`, leaving four
): ControlsViewFields => {
  const { hidden, focus, tags } = filters;
  const fields: ControlsViewFields = {
    controlsOpen: isOpen,
    search,
    depth,
    hidden: [...hidden],
    focus: focus?.name ?? null,
    tags: [...tags],
    grouped: isGrouped
  };

  return fields;
};
