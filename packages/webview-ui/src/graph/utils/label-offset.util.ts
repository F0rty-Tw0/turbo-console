import type { Position } from '../../bridge/common/graph-state.type.ts';
import { LABEL_GAP_PX, ROUTE_RADIUS_PX } from '../common/graph-layout.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

type Segment = { readonly from: Position; readonly to: Position };

const ORIGIN: Position = { x: 0, y: 0 };

const lengthOf = (segment: Segment): number => Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y);

const unitOf = (segment: Segment): Position => {
  const length = lengthOf(segment);
  const unit: Position = { x: (segment.to.x - segment.from.x) / length, y: (segment.to.y - segment.from.y) / length };

  return unit;
};

const alongOf = (anchor: Position, segment: Segment): number => {
  const u = unitOf(segment);

  return (anchor.x - segment.from.x) * u.x + (anchor.y - segment.from.y) * u.y;
};

const pointAlongOf = (segment: Segment, along: number): Position => {
  const u = unitOf(segment);
  const point: Position = { x: segment.from.x + u.x * along, y: segment.from.y + u.y * along };

  return point;
};

const distanceOf = (anchor: Position, segment: Segment): number => {
  const clamped = Math.min(Math.max(alongOf(anchor, segment), 0), lengthOf(segment));
  const point = pointAlongOf(segment, clamped);

  return Math.hypot(anchor.x - point.x, anchor.y - point.y);
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

const scaledOf = (v: Position, factor: number): Position => {
  const scaled: Position = { x: v.x * factor, y: v.y * factor };

  return scaled;
};

const reachOf = (v: Position, size: NodeSize): number => (Math.abs(v.x) * size.width + Math.abs(v.y) * size.height) / 2 + LABEL_GAP_PX;

/** The direction, away from the bend, of the segment next to the nearest one that lies within the arc radius of the anchor; `null` on a straight stretch. */
const otherArmOf = (segments: Segment[], index: number, anchor: Position): Position | null => {
  const previous = segments[index - 1];
  const next = segments[index + 1];
  const previousGap = gapOf(anchor, previous);
  const nextGap = gapOf(anchor, next);
  const isNearPrevious = previousGap <= ROUTE_RADIUS_PX;
  const isNearNext = nextGap <= ROUTE_RADIUS_PX;

  if (previous && isNearPrevious) return scaledOf(unitOf(previous), -1);

  if (next && isNearNext) return unitOf(next);

  return null;
};

const awayFromOf = (normal: Position, other: Position): Position => {
  const isTowardOther = normal.x * other.x + normal.y * other.y > 0;
  const side = isTowardOther ? -1 : 1;

  return scaledOf(normal, side);
};

const bendOffsetOf = (nearest: Segment, away: Position, anchor: Position, size: NodeSize): Position => {
  const push = scaledOf(away, reachOf(away, size));
  const foot = pointAlongOf(nearest, alongOf(anchor, nearest));
  const offset: Position = { x: foot.x - anchor.x + push.x, y: foot.y - anchor.y + push.y };

  return offset;
};

/** Where a label sits off its line: the nearest segment's left normal, or on a bend the side away from the other arm, by half the label's extent plus a gap. */
export const labelOffsetOf = (path: Position[], anchor: Position, size: NodeSize): Position => {
  const segments = segmentsOf(path);
  const gaps = segments.map((segment) => distanceOf(anchor, segment));
  const index = gaps.indexOf(Math.min(...gaps));
  const nearest = segments[index];

  if (!nearest) return ORIGIN;

  const u = unitOf(nearest);
  const normal: Position = { x: -u.y, y: u.x };
  const other = otherArmOf(segments, index, anchor);

  if (other) return bendOffsetOf(nearest, awayFromOf(normal, other), anchor, size);

  return scaledOf(normal, reachOf(normal, size));
};
