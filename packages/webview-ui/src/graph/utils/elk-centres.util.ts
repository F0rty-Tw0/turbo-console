import type { ElkNode } from 'elkjs/lib/elk-api.js';

import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';

const centreEntryOf = (child: ElkNode): [string, Position] => {
  const { x = 0, y = 0, width = 0, height = 0 } = child;
  const centre: Position = { x: x + width / 2, y: y + height / 2 };

  return [child.id, centre];
};

/** ELK places a child by its top-left corner; Cytoscape `preset` places a node by its centre. */
export const centresOf = (laidOut: ElkNode): Positions => {
  const children = laidOut.children ?? [];
  const entries = children.map(centreEntryOf);

  return Object.fromEntries(entries);
};
