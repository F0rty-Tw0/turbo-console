import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

/** Whether the graph holds the link `source -> target`; direction matters. */
export const hasEdge = (edges: GraphEdge[], source: string, target: string): boolean => {
  const isLink = (edge: GraphEdge): boolean => edge.source === source && edge.target === target;

  return edges.some(isLink);
};
