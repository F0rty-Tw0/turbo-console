import type { Position } from '../../bridge/common/graph-state.type.ts';

const ORIGIN: Position = { x: 0, y: 0 };

const minOf = (values: number[]): number => values.reduce((low, value) => Math.min(low, value));

const maxOf = (values: number[]): number => values.reduce((high, value) => Math.max(high, value));

/** The middle of the bounding box of every member's position, hidden members included; the origin for none. */
export const collapsedCentreOf = (members: string[], positionOf: (name: string) => Position): Position => {
  if (members.length === 0) return ORIGIN;

  const positions = members.map(positionOf);
  const xs = positions.map((position) => position.x);
  const ys = positions.map((position) => position.y);
  const x = (minOf(xs) + maxOf(xs)) / 2;
  const y = (minOf(ys) + maxOf(ys)) / 2;
  const centre: Position = { x, y };

  return centre;
};
