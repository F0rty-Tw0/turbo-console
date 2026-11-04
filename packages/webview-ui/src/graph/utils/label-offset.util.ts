import { dotOf, offsetOf, scaledOf, sumOf } from './vector.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import { LABEL_GAP_PX, ROUTE_RADIUS_PX } from '../common/graph-layout.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

type Segment = { readonly from: Position; readonly to: Position };

const ORIGIN: Position = { x: 0, y: 0 };

const lengthOf = (segment: Segment): number => {
  const direction = offsetOf(segment.to, segment.from);

  return Math.hypot(direction.x, direction.y);
};

const unitOf = (segment: Segment): Position => {
  const direction = offsetOf(segment.to, segment.from);
  const length = lengthOf(segment);
  const unit: Position = { x: direction.x / length, y: direction.y / length };

  return unit;
};

const backwardOf = (segment: Segment): Position => {
  const unit = unitOf(segment);

  return scaledOf(unit, -1);
};

const alongOf = (anchor: Position, segment: Segment): number => {
  const unit = unitOf(segment);
  const offset = offsetOf(anchor, segment.from);

  return dotOf(offset, unit);
};

const pointAlongOf = (segment: Segment, along: number): Position => {
  const unit = unitOf(segment);
  const step = scaledOf(unit, along);

  return sumOf(segment.from, step);
};

const distanceOf = (anchor: Position, segment: Segment): number => {
  const along = alongOf(anchor, segment);
  const length = lengthOf(segment);
  const clamped = Math.min(Math.max(along, 0), length);
  const point = pointAlongOf(segment, clamped);
  const offset = offsetOf(anchor, point);

  return Math.hypot(offset.x, offset.y);
};

const gapOf = (anchor: Position, segment: Segment | undefined): number => {
  if (!segment) return Infinity;

  return distanceOf(anchor, segment);
};

const segmentsOf = (path: Position[]): Segment[] => {
  const toSegment = (to: Position, index: number): Segment => {
    const segment: Segment = { from: path[index] ?? to, to };

    return segment;
  };
  const pairs = path.slice(1).map(toSegment);

  return pairs.filter((segment) => lengthOf(segment) > 0);
};

const reachOf = (vector: Position, size: NodeSize): number => {
  const extent = Math.abs(vector.x) * size.width + Math.abs(vector.y) * size.height;

  return extent / 2 + LABEL_GAP_PX;
};

const pushedOf = (vector: Position, size: NodeSize): Position => {
  const reach = reachOf(vector, size);

  return scaledOf(vector, reach);
};

/** The direction, away from the bend, of the segment next to the nearest one that lies within the arc radius of the anchor; `null` on a straight stretch. */
const otherArmOf = (segments: Segment[], index: number, anchor: Position): Position | null => {
  const previous = segments[index - 1];
  const next = segments[index + 1];
  const previousGap = gapOf(anchor, previous);
  const nextGap = gapOf(anchor, next);
  const isNearPrevious = previousGap <= ROUTE_RADIUS_PX;
  const isNearNext = nextGap <= ROUTE_RADIUS_PX;

  if (previous && isNearPrevious) return backwardOf(previous);

  if (next && isNearNext) return unitOf(next);

  return null;
};

const awayFromOf = (normal: Position, other: Position): Position => {
  const toward = dotOf(normal, other);
  const isTowardOther = toward > 0;
  const side = isTowardOther ? -1 : 1;

  return scaledOf(normal, side);
};

const bendOffsetOf = (nearest: Segment, away: Position, anchor: Position, size: NodeSize): Position => {
  const push = pushedOf(away, size);
  const along = alongOf(anchor, nearest);
  const foot = pointAlongOf(nearest, along);
  const toFoot = offsetOf(foot, anchor);

  return sumOf(toFoot, push);
};

/** Where a label sits off its line: the nearest segment's left normal, or on a bend the side away from the other arm, by half the label's extent plus a gap. */
export const labelOffsetOf = (path: Position[], anchor: Position, size: NodeSize): Position => {
  const segments = segmentsOf(path);
  const gaps = segments.map((segment) => distanceOf(anchor, segment));
  const nearestGap = Math.min(...gaps);
  const index = gaps.indexOf(nearestGap);
  const nearest = segments[index];

  if (!nearest) return ORIGIN;

  const unit = unitOf(nearest);
  const normal: Position = { x: -unit.y, y: unit.x };
  const other = otherArmOf(segments, index, anchor);

  if (!other) return pushedOf(normal, size);

  const away = awayFromOf(normal, other);

  return bendOffsetOf(nearest, away, anchor, size);
};
