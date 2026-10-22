import type { ElkNode } from 'elkjs/lib/elk-api.js';

import { isElkLeaf } from './elk-flat-graph.util.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';

type CentreEntry = [string, Position];

const leafEntryOf = (leaf: ElkNode, originX: number, originY: number): CentreEntry => {
  const { x = 0, y = 0, width = 0, height = 0 } = leaf;
  const centre: Position = { x: originX + x + width / 2, y: originY + y + height / 2 };

  return [leaf.id, centre];
};

/** The entries of every leaf under `node`, whose parent's corner sits at `(originX, originY)`. */
const entriesUnder = (node: ElkNode, originX: number, originY: number): CentreEntry[] => {
  const x = originX + (node.x ?? 0);
  const y = originY + (node.y ?? 0);
  const children = node.children ?? [];
  const entriesOf = (child: ElkNode): CentreEntry[] => {
    const isLeaf = isElkLeaf(child);

    if (isLeaf) return [leafEntryOf(child, x, y)];

    return entriesUnder(child, x, y);
  };

  return children.flatMap(entriesOf);
};

/**
 * ELK places a child by its top-left corner, relative to its parent; Cytoscape `preset` places a node by its centre in
 * the root's frame. Compounds add their offset and have no entry of their own.
 */
export const nestedCentresOf = (laidOut: ElkNode): Positions => {
  const entries = entriesUnder(laidOut, 0, 0);

  return Object.fromEntries(entries);
};
