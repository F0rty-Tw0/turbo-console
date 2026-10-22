import { hasEdge } from './edge-exists.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { GraphLinkRef } from '../../bridge/common/graph-view-state.type.ts';

/** Whether a link can still be shown: both ends visible and its edge drawn (spec §4.3 re-check, §4.6 restore). */
export const isLinkKept = (link: GraphLinkRef, visible: ReadonlySet<string>, edges: GraphEdge[]): boolean => {
  const { source, target } = link;
  const hasSource = visible.has(source);
  const hasTarget = visible.has(target);
  const isDrawn = hasEdge(edges, source, target);

  return hasSource && hasTarget && isDrawn;
};
