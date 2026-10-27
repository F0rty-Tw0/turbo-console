import { focusClearedOf, toggleRow } from './controls-rules.util.ts';
import { visibleOf } from './visibility.util.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';

const isShownBy = (filters: GraphFilters, graph: DrawnGraph, name: string): boolean => {
  const visible = visibleOf(graph.infos, graph.edges, filters);

  return visible.has(name);
};

const withoutTags = (filters: GraphFilters): GraphFilters => {
  const cleared: GraphFilters = { ...filters, tags: new Set() };

  return cleared;
};

/**
 * The filters that show `name`: its tick, the focus when the focus alone leaves it out, then the tags while they still
 * do; a filter that does not hide it stays, and with nothing hiding it the result is `filters` itself. The search is left
 * alone, as it narrows only the list.
 */
export const revealFiltersOf = (filters: GraphFilters, graph: DrawnGraph, name: string): GraphFilters => {
  const isShown = isShownBy(filters, graph, name);

  if (isShown) return filters;

  const isHidden = filters.hidden.has(name);
  const unhidden = toggleRow(filters, name, true);
  const ticked = isHidden ? unhidden : filters;
  const untagged = withoutTags(ticked);
  const isInFocus = isShownBy(untagged, graph, name);
  const unfocused = focusClearedOf(ticked);
  const focused = isInFocus ? ticked : unfocused;
  const isShownFocused = isShownBy(focused, graph, name);

  if (isShownFocused) return focused;

  return withoutTags(focused);
};
