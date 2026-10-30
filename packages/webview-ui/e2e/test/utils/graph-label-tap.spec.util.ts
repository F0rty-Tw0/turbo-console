import type { ProbeRect } from '../../../src/graph/common/graph-probe.type.ts';
import type { LinkEnds, ViewportPoint } from '../../common/playwright.type.ts';

/** How far in from a label box's corner a tap lands: inside the box. */
const LABEL_INSET_PX = 3;

/** How far a label tap point must sit from the line between the link's ends, so the tap cannot be the line's. */
export const MIN_LINE_DISTANCE_PX = 8;

/** The distance of `point` from the infinite line through both link ends; `NaN` when the ends coincide. */
export const distanceFromLine = (point: ViewportPoint, ends: LinkEnds): number => {
  const { from, to } = ends;
  const spanX = to.x - from.x;
  const spanY = to.y - from.y;
  const cross = spanX * (point.y - from.y) - spanY * (point.x - from.x);

  return Math.abs(cross) / Math.hypot(spanX, spanY);
};

const cornersOf = (box: ProbeRect): ViewportPoint[] => {
  const left = box.left + LABEL_INSET_PX;
  const top = box.top + LABEL_INSET_PX;
  const right = box.left + box.width - LABEL_INSET_PX;
  const bottom = box.top + box.height - LABEL_INSET_PX;
  const corners: ViewportPoint[] = [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom }
  ];

  return corners;
};

/** The corner of a label box, 3 px in, that lies farthest from the line between the link's ends. */
export const labelTapPointOf = (box: ProbeRect, ends: LinkEnds): ViewportPoint => {
  const distanceOf = (corner: ViewportPoint): number => distanceFromLine(corner, ends);
  const farthest = (best: ViewportPoint, corner: ViewportPoint): ViewportPoint =>
    distanceOf(corner) > distanceOf(best) ? corner : best;

  return cornersOf(box).reduce(farthest);
};
