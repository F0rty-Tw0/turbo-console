import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { GhostMarks } from '../common/ghost.type.ts';
import type { TraceResult } from '../common/trace.type.ts';

/** The path packages outside `visible`, in path order, and the trace's own link objects that touch one; none without a path. */
export const ghostMarksOf = (trace: TraceResult | null, visible: ReadonlySet<string>): GhostMarks => {
  if (trace === null || trace.direction === 'none') {
    const none: GhostMarks = { nodes: [], edges: [] };

    return none;
  }

  const nodes = trace.path.filter((name: string): boolean => !visible.has(name));
  const ghosts = new Set(nodes);
  const touchesGhost = (edge: GraphEdge): boolean => ghosts.has(edge.source) || ghosts.has(edge.target);
  const edges = trace.edges.filter(touchesGhost);
  const marks: GhostMarks = { nodes, edges };

  return marks;
};
