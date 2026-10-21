import { toggleRow } from './controls-rules.util.ts';
import { visibleOf } from './visibility.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';

/** Whether ticking `name` alone would show it: hidden now, visible once unchecked-only is lifted; a tag or focus exclusion never qualifies. */
export const isShowable = (packages: GraphPackage[], edges: GraphEdge[], filters: GraphFilters, name: string): boolean => {
  const shownNow = visibleOf(packages, edges, filters);
  const reticked = toggleRow(filters, name, true);
  const shownAfter = visibleOf(packages, edges, reticked);

  return !shownNow.has(name) && shownAfter.has(name);
};
