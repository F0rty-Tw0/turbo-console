import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

/** The trace's path packages the filters hide, and the path links that touch them; both are drawn dashed. */
export type GhostMarks = {
  readonly nodes: string[];
  readonly edges: GraphEdge[];
};
