import { NODE_HEIGHT, NODE_PADDING_X } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

/** The box of a node whose label is `textWidth` px wide; the same box goes to ELK and Cytoscape. */
export const nodeSizeOf = (textWidth: number): NodeSize => {
  const size: NodeSize = { width: textWidth + NODE_PADDING_X, height: NODE_HEIGHT };

  return size;
};
