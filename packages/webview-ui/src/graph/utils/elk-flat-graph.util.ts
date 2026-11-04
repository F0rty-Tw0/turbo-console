import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

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

/** The edges of `node` then of every compound below it, depth-first. */
const edgesUnder = (node: ElkNode): ElkEdge[] => {
  const own = node.edges ?? [];
  const children = node.children ?? [];
  const below = children.flatMap(edgesUnder);

  return [...own, ...below];
};

/**
 * The graph with every package leaf lifted to the root in depth-first order and every edge of every depth kept (the root's
 * first), for the fallback layout and the grid.
 */
export const flatElkGraphOf = (graph: ElkNode): ElkNode => {
  const children = leavesOf(graph);
  const edges = edgesUnder(graph);
  const flat: ElkNode = { ...graph, children, edges };

  return flat;
};
