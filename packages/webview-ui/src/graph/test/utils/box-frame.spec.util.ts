import type { BoundingBox12, NodeSingular } from 'cytoscape';

/**
 * Where `box`'s frame line runs: its body, padding included, with the border centred on it. Its bounding box reaches
 * further, by the border's outer half and Cytoscape's 1 px antialiasing margin.
 */
export const frameLineOf = (box: NodeSingular): BoundingBox12 => {
  const { x, y } = box.position();
  const border = Number(box.numericStyle('border-width'));
  const halfWidth = (box.outerWidth() - border) / 2;
  const halfHeight = (box.outerHeight() - border) / 2;
  const sides: BoundingBox12 = { x1: x - halfWidth, x2: x + halfWidth, y1: y - halfHeight, y2: y + halfHeight };

  return sides;
};

/** The largest gap between a side of `drawn` and the same side of `wanted`. */
export const sideErrorOf = (drawn: BoundingBox12, wanted: BoundingBox12): number => {
  const signed = [drawn.x1 - wanted.x1, drawn.x2 - wanted.x2, drawn.y1 - wanted.y1, drawn.y2 - wanted.y2];
  const gaps = signed.map(Math.abs);

  return Math.max(...gaps);
};
