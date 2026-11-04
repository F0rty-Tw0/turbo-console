import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import { edgeIdOf } from './edge-id.util.ts';
import { groupedRootOptionsOf, paddedOptionsOf } from './elk-options.util.ts';
import { packComponentsOf } from './elk-pack.util.ts';
import { folderIdOf } from './folder-id.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import { LAYERING_DEFAULT } from '../common/graph-layout.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

export const elkEdgeOf = (edge: GraphEdge): ElkEdge => {
  const elkEdge: ElkEdge = { id: edgeIdOf(edge), sources: [edge.source], targets: [edge.target] };

  return elkEdge;
};

/**
 * The grouped ELK input: one padded compound per folder, its packages as leaves, every edge at the root so ELK routes
 * links across folders (`INCLUDE_CHILDREN`); folders no link joins are packed into wrappers (`packComponentsOf`).
 */
export const groupedElkGraphOf = (groups: FolderGroup[], edges: GraphEdge[], sizeOf: (name: string) => NodeSize): ElkNode => {
  const leafOf = (pkg: GraphPackage): ElkNode => {
    const { width, height } = sizeOf(pkg.name);
    const leaf: ElkNode = { id: pkg.name, width, height };

    return leaf;
  };
  const leafCount = groups.flatMap((group) => group.packages).length;
  const compoundOptions = paddedOptionsOf(leafCount, LAYERING_DEFAULT);
  const compoundOf = (group: FolderGroup): ElkNode => {
    const children = group.packages.map(leafOf);
    const compound: ElkNode = { id: folderIdOf(group.folder), layoutOptions: compoundOptions, children };

    return compound;
  };
  const children = groups.map(compoundOf);
  const elkEdges = edges.map(elkEdgeOf);
  const layoutOptions = groupedRootOptionsOf(leafCount, LAYERING_DEFAULT);
  const graph: ElkNode = { id: 'root', layoutOptions, children, edges: elkEdges };

  return packComponentsOf(graph);
};
