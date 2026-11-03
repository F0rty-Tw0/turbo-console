import type { EdgeRoute, Position } from '../../../bridge/common/graph-state.type.ts';

const START: Position = { x: 0, y: 0 };
const END: Position = { x: 0, y: 10 };

const bendAt = (_: unknown, index: number): Position => {
  const bend: Position = { x: index, y: index };

  return bend;
};

/** A route from (0, 0) to (0, 10) with `count` bends. */
export const routeWithBends = (count: number): EdgeRoute => {
  const bends = Array.from({ length: count }, bendAt);
  const route: EdgeRoute = { start: START, bends, end: END };

  return route;
};
