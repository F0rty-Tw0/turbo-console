import type { Core, NodeSingular } from 'cytoscape';

import { packageNodes } from './graph-boxes.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';

const ORIGIN: Position = { x: 0, y: 0 };

/**
 * A copy of the position of `name`, since Cytoscape keeps the object it is added with and moves it in place; own entries
 * only, so a package named `constructor` or `toString` never resolves to an inherited member.
 */
export const positionOf = (positions: Positions, name: string): Position => {
  const placed = Object.hasOwn(positions, name) ? positions[name] : undefined;
  const { x, y } = placed ?? ORIGIN;
  const position: Position = { x, y };

  return position;
};

/** Moves the packages to `placed`; a folder box has no position of its own. */
export const placeNodes = (cy: Core, placed: Positions): void => {
  const placeNode = (node: NodeSingular): Position => positionOf(placed, node.id());

  packageNodes(cy).positions(placeNode);
};
