import type { BoundingBox12 } from 'cytoscape';

const minOf = (values: number[]): number => values.reduce((low, value) => Math.min(low, value));

const maxOf = (values: number[]): number => values.reduce((high, value) => Math.max(high, value));

/** The smallest box holding every box of `boxes`; `null` for none. */
export const unionBoxOf = (boxes: BoundingBox12[]): BoundingBox12 | null => {
  if (boxes.length === 0) return null;

  const lefts = boxes.map((box) => box.x1);
  const tops = boxes.map((box) => box.y1);
  const rights = boxes.map((box) => box.x2);
  const bottoms = boxes.map((box) => box.y2);
  const union: BoundingBox12 = { x1: minOf(lefts), y1: minOf(tops), x2: maxOf(rights), y2: maxOf(bottoms) };

  return union;
};
