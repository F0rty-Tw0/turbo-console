import { sumOf } from './layout-geometry.spec.util.ts';
import type { Position } from '../../../bridge/common/graph-state.type.ts';
import type { DrawnLine, LayoutFit, PlacedRect, Placement, Rect } from '../common/layout-quality.type.ts';
import type { U0Canvas } from '../common/u0-workspace.type.ts';

const BORDER_PX = 1.5;
const FIT_MARGIN_PX = 24;
const MAX_ZOOM = 2;

const grown = (box: PlacedRect): PlacedRect => {
  const drawn: PlacedRect = { ...box, x1: box.x1 - BORDER_PX, y1: box.y1 - BORDER_PX, x2: box.x2 + BORDER_PX, y2: box.y2 + BORDER_PX };

  return drawn;
};

const pointRectOf = (point: Position): Rect => {
  const rect: Rect = { x1: point.x, y1: point.y, x2: point.x, y2: point.y };

  return rect;
};

/** The fit zoom and aspect of leaves, drawn boxes (ELK rect plus border) and route points (`harness.mjs:112-121`). */
export const fitOf = (placement: Placement, lines: DrawnLine[], canvas: U0Canvas): LayoutFit => {
  const points = lines.flatMap((line) => line.points).map(pointRectOf);
  const drawnBoxes = placement.boxes.map(grown);
  const rects = [...placement.leaves, ...drawnBoxes, ...points];
  const lefts = rects.map((rect) => rect.x1);
  const rights = rects.map((rect) => rect.x2);
  const tops = rects.map((rect) => rect.y1);
  const bottoms = rects.map((rect) => rect.y2);
  const width = Math.max(...rights) - Math.min(...lefts);
  const height = Math.max(...bottoms) - Math.min(...tops);
  const zoomX = (canvas.width - 2 * FIT_MARGIN_PX) / width;
  const zoomY = (canvas.height - 2 * FIT_MARGIN_PX) / height;
  const fit: LayoutFit = { fitZoom: Math.min(zoomX, zoomY, MAX_ZOOM), fitAspect: width / height };

  return fit;
};

const overlaps = (left: PlacedRect, right: PlacedRect): boolean => {
  const isNested = left.ancestors.includes(right.id) || right.ancestors.includes(left.id);
  const meetX = left.x1 < right.x2 && right.x1 < left.x2;

  return !isNested && meetX && left.y1 < right.y2 && right.y1 < left.y2;
};

/** Pairs of drawn boxes, neither inside the other, that overlap (`harness.mjs:127`). */
export const boxOverlapOf = (boxes: PlacedRect[]): number => {
  const drawn = boxes.map(grown);
  const overlapsLater = (box: PlacedRect, index: number): number => {
    const later = drawn.slice(index + 1);
    const overlapsBox = (other: PlacedRect): boolean => overlaps(box, other);
    const overlapping = later.filter(overlapsBox);

    return overlapping.length;
  };
  const counts = drawn.map(overlapsLater);

  return counts.reduce(sumOf, 0);
};
