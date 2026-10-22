import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import { edgeIdOf } from './edge-id.util.ts';
import { groupedElkGraphOf } from './elk-grouped-graph.util.ts';
import { folderGroupsOf } from './folder-group.util.ts';
import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';
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

/** The ELK input of the drawn graph in `mode`: flat, or one compound per folder. */
export const layoutGraphOf = (drawn: DrawnGraph, mode: LayoutGrouping, sizeOf: (name: string) => NodeSize): ElkNode => {
  if (mode === 'flat') return elkGraphOf(drawn.packages, drawn.edges, sizeOf);

  const groups = folderGroupsOf(drawn.infos);

  return groupedElkGraphOf(groups, drawn.edges, sizeOf);
};
