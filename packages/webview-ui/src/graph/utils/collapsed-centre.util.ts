import type { BoundingBox12 } from 'cytoscape';

import { unionBoxOf } from './folder-box.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

const ORIGIN: Position = { x: 0, y: 0 };

const pointBoxOf = (position: Position): BoundingBox12 => {
  const box: BoundingBox12 = { x1: position.x, y1: position.y, x2: position.x, y2: position.y };

  return box;
};

/** The middle of the bounding box of every member's position, hidden members included; the origin for none. */
export const collapsedCentreOf = (members: string[], positionOf: (name: string) => Position): Position => {
  const positions = members.map(positionOf);
  const boxes = positions.map(pointBoxOf);
  const box = unionBoxOf(boxes);

  if (box === null) return ORIGIN;

  const centre: Position = { x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 };

  return centre;
};
