import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import { edgeIdOf } from './edge-id.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { ELK_OPTIONS } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

const elkEdgeOf = (edge: GraphEdge): ElkEdge => {
  const elkEdge: ElkEdge = { id: edgeIdOf(edge), sources: [edge.source], targets: [edge.target] };

  return elkEdge;
};

/** The ELK input: one sized child per package, one edge per dependency, running from the dependent to the dependency. */
export const elkGraphOf = (packages: string[], edges: GraphEdge[], sizeOf: (name: string) => NodeSize): ElkNode => {
  const childOf = (name: string): ElkNode => {
    const { width, height } = sizeOf(name);
    const child: ElkNode = { id: name, width, height };

    return child;
  };
  const children = packages.map(childOf);
  const elkEdges = edges.map(elkEdgeOf);
  const graph: ElkNode = { id: 'root', layoutOptions: ELK_OPTIONS, children, edges: elkEdges };

  return graph;
};
