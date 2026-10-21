import type { ElkNode } from 'elkjs/lib/elk-api.js';

import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { FALLBACK_SPACING_FACTOR, NODE_HEIGHT, NODE_PADDING_X } from '../common/graph.const.ts';

const widerOf = (widest: number, child: ElkNode): number => Math.max(widest, child.width ?? 0);

/** The distance between two fallback cells: the widest node plus padding across, `FALLBACK_SPACING_FACTOR` node heights down. */
export const cellPitchOf = (children: ElkNode[]): Position => {
  const x = children.reduce(widerOf, 0) + NODE_PADDING_X;
  const pitch: Position = { x, y: NODE_HEIGHT * FALLBACK_SPACING_FACTOR };

  return pitch;
};

/** The last-resort layout, for when the fallback throws as well: the children row by row in a square grid, in order. */
export const gridPositions = (graph: ElkNode): Positions => {
  const children = graph.children ?? [];
  const sideLength = Math.ceil(Math.sqrt(children.length));
  const columns = Math.max(1, sideLength);
  const pitch = cellPitchOf(children);
  const entryOf = (child: ElkNode, index: number): [string, Position] => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const position: Position = { x: column * pitch.x, y: row * pitch.y };

    return [child.id, position];
  };
  const entries = children.map(entryOf);

  return Object.fromEntries(entries);
};
