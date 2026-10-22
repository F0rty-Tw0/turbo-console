import { folderOf, tagsOf } from './folder-group.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphFocus, GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { RestoredControls } from '../common/graph-controls.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { ControlsViewFields, DrawnGraph } from '../common/graph-page.type.ts';

const isFocusKnown = (focus: GraphFocus, infos: GraphPackage[]): boolean => {
  if (focus.kind === 'package') return infos.some((info) => info.name === focus.name);

  return infos.some((info) => folderOf(info.path) === focus.folder);
};

const focusOf = (state: GraphViewState, graph: DrawnGraph): GraphFocus | null => {
  const { focus } = state;

  if (focus === null) return null;

  const isKnown = isFocusKnown(focus, graph.infos);

  return isKnown ? focus : null;
};

/** The saved filters kept to what the drawn graph still has; the focused package leaves `hidden`; `filters.depth` is the saved depth as is. */
export const restoredFilters = (state: GraphViewState, graph: DrawnGraph): RestoredControls => {
  const known = new Set(graph.infos.map((info) => info.name));
  const knownTags = new Set(tagsOf(graph.infos));
  const focus = focusOf(state, graph);
  const focusedName = focus?.kind === 'package' ? focus.name : null;
  const isKept = (name: string): boolean => known.has(name) && name !== focusedName;
  const hidden = new Set(state.hidden.filter(isKept));
  const tags = new Set(state.tags.filter((tag) => knownTags.has(tag)));
  const filters: GraphFilters = { hidden, focus, depth: state.depth, tags };
  const restored: RestoredControls = {
    filters,
    search: state.search,
    isOpen: state.controlsOpen,
    isGrouped: state.grouped
  };

  return restored;
};

/** The controls part of the saved view state: the inverse of `restoredFilters`, without `collapsed` (the folders own it). */
export const controlsFieldsOf = (
  filters: GraphFilters,
  search: string,
  isOpen: boolean,
  isGrouped: boolean
): Omit<ControlsViewFields, 'collapsed'> => {
  const { hidden, focus, depth, tags } = filters;
  const fields: Omit<ControlsViewFields, 'collapsed'> = {
    controlsOpen: isOpen,
    search,
    depth,
    hidden: [...hidden],
    focus,
    tags: [...tags],
    grouped: isGrouped
  };

  return fields;
};
