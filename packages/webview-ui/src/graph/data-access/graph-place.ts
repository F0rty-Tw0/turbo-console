import type { Core, NodeSingular } from 'cytoscape';

import { packageNodes } from './graph-boxes.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';

const ORIGIN: Position = { x: 0, y: 0 };

/** Own entries only, so a package named `constructor` or `toString` never resolves to an inherited member. */
export const positionOf = (positions: Positions, name: string): Position => {
  const position = Object.hasOwn(positions, name) ? positions[name] : undefined;

  return position ?? ORIGIN;
};

/** Moves the packages to `placed`; a folder box has no position of its own. */
export const placeNodes = (cy: Core, placed: Positions): void => {
  const placeNode = (node: NodeSingular): Position => positionOf(placed, node.id());

  packageNodes(cy).positions(placeNode);
};
