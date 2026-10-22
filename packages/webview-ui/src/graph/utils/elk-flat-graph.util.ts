import type { ElkNode } from 'elkjs/lib/elk-api.js';

/** A package is a node without children; a folder compound has some. */
export const isElkLeaf = (node: ElkNode): boolean => {
  const children = node.children ?? [];

  return children.length === 0;
};

const leavesOf = (node: ElkNode): ElkNode[] => {
  const children = node.children ?? [];
  const leavesUnder = (child: ElkNode): ElkNode[] => {
    const isLeaf = isElkLeaf(child);

    if (isLeaf) return [child];

    return leavesOf(child);
  };

  return children.flatMap(leavesUnder);
};

/** The graph with every package leaf lifted to the root in depth-first order, for the fallback layout and the grid. */
export const flatElkGraphOf = (graph: ElkNode): ElkNode => {
  const children = leavesOf(graph);
  const flat: ElkNode = { ...graph, children };

  return flat;
};
