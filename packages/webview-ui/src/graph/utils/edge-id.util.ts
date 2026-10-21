import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { EDGE_ID_PREFIX } from '../common/graph.const.ts';

/** The edge's id and dedupe key: one per `source`, `target` pair, whatever characters the two names hold. */
export const edgeIdOf = (edge: GraphEdge): string => {
  const ends = JSON.stringify([edge.source, edge.target]);

  return `${EDGE_ID_PREFIX}${ends}`;
};
