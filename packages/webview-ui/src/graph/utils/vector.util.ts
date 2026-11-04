import type { Position } from '../../bridge/common/graph-state.type.ts';

/** The vector from `origin` to `point`. */
export const offsetOf = (point: Position, origin: Position): Position => {
  const offset: Position = { x: point.x - origin.x, y: point.y - origin.y };

  return offset;
};

export const sumOf = (first: Position, second: Position): Position => {
  const sum: Position = { x: first.x + second.x, y: first.y + second.y };

  return sum;
};

export const dotOf = (first: Position, second: Position): number => first.x * second.x + first.y * second.y;

export const scaledOf = (vector: Position, factor: number): Position => {
  const scaled: Position = { x: vector.x * factor, y: vector.y * factor };

  return scaled;
};
