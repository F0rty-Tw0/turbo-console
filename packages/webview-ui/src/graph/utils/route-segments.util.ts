import type { EdgeRoute, Position } from '../../bridge/common/graph-state.type.ts';
import type { RouteSegments } from '../common/route-segments.type.ts';

const offsetOf = (point: Position, origin: Position): Position => {
  const offset: Position = { x: point.x - origin.x, y: point.y - origin.y };

  return offset;
};

const dotOf = (a: Position, b: Position): number => a.x * b.x + a.y * b.y;

const endpointOf = (point: Position, centre: Position): string => {
  const offset = offsetOf(point, centre);

  return `${offset.x}px ${offset.y}px`;
};

const midpointOf = (a: Position, b: Position): Position => {
  const midpoint: Position = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

  return midpoint;
};

/** Cytoscape cannot draw a `round-segments` edge with empty weights, so a straight route draws on one bend at its middle. */
const segmentBendsOf = (route: EdgeRoute): Position[] => {
  if (route.bends.length > 0) return route.bends;

  const midpoint = midpointOf(route.start, route.end);
  const bends = [midpoint];

  return bends;
};

/**
 * The inverse of Cytoscape's `node-position` segment maths (cytoscape.cjs.js `findSegmentsPoints`), which places a bend
 * at `S + w·(T−S) + d·n` with `n = (−dy, dx) / L` in the edge's own source → target frame. `source` and `target` are the
 * centres Cytoscape draws the edge's ends from. `null` when they coincide, since then there is no frame to measure in.
 */
export const routeSegmentsOf = (route: EdgeRoute, source: Position, target: Position): RouteSegments | null => {
  const along = offsetOf(target, source);
  const lengthSquared = dotOf(along, along);

  if (lengthSquared === 0) return null;

  const length = Math.sqrt(lengthSquared);
  const normal: Position = { x: -along.y / length, y: along.x / length };
  const bends = segmentBendsOf(route);
  const offsets = bends.map((bend): Position => offsetOf(bend, source));
  const segWeights = offsets.map((offset): number => dotOf(offset, along) / lengthSquared);
  const segDistances = offsets.map((offset): number => dotOf(offset, normal));
  const srcEnd = endpointOf(route.start, source);
  const tgtEnd = endpointOf(route.end, target);
  const segments: RouteSegments = { segWeights, segDistances, srcEnd, tgtEnd };

  return segments;
};
