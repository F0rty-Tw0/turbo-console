import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import { edgeIdOf } from './edge-id.util.ts';
import { folderIdOf } from './folder-id.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import { ELK_GROUPED_ROOT_OPTIONS, ELK_OPTIONS, FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

const PADDING = `[top=${FOLDER_PADDING_PX},left=${FOLDER_PADDING_PX},bottom=${FOLDER_PADDING_PX},right=${FOLDER_PADDING_PX}]`;

/** A padded compound: the layered options plus room for its frame. */
export const COMPOUND_OPTIONS: Readonly<Record<string, string>> = { ...ELK_OPTIONS, 'elk.padding': PADDING };

export const elkEdgeOf = (edge: GraphEdge): ElkEdge => {
  const elkEdge: ElkEdge = { id: edgeIdOf(edge), sources: [edge.source], targets: [edge.target] };

  return elkEdge;
};

/**
 * The grouped ELK input: one padded compound per folder, its packages as leaves, every edge at the root so ELK routes
 * links across folders (`INCLUDE_CHILDREN`).
 */
export const groupedElkGraphOf = (groups: FolderGroup[], edges: GraphEdge[], sizeOf: (name: string) => NodeSize): ElkNode => {
  const leafOf = (pkg: GraphPackage): ElkNode => {
    const { width, height } = sizeOf(pkg.name);
    const leaf: ElkNode = { id: pkg.name, width, height };

    return leaf;
  };
  const compoundOf = (group: FolderGroup): ElkNode => {
    const children = group.packages.map(leafOf);
    const compound: ElkNode = { id: folderIdOf(group.folder), layoutOptions: COMPOUND_OPTIONS, children };

    return compound;
  };
  const children = groups.map(compoundOf);
  const elkEdges = edges.map(elkEdgeOf);
  const graph: ElkNode = { id: 'root', layoutOptions: ELK_GROUPED_ROOT_OPTIONS, children, edges: elkEdges };

  return graph;
};
