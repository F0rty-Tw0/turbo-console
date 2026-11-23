import type { ElkNode } from 'elkjs/lib/elk-api.js';

/** The nodes ELK lays out for `graph`: every child at any depth, compounds, title slots and pack wrappers included, the root not. */
export const elkNodeCountOf = (graph: ElkNode): number => {
  const children = graph.children ?? [];
  const addUnder = (total: number, child: ElkNode): number => total + 1 + elkNodeCountOf(child);

  return children.reduce(addUnder, 0);
};
