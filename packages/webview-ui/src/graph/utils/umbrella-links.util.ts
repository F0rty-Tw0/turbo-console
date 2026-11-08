import { edgeIdOf } from './edge-id.util.ts';
import { routeSegmentsOf } from './route-segments.util.ts';
import { offsetOf, sumOf } from './vector.util.ts';
import type { EdgeRoute, GraphEdge, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomPositions, BoxBounds } from '../common/atom-layout.type.ts';
import { ATOM_BOX_PREFIX } from '../common/graph-atom.const.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';
import type { RouteSegments } from '../common/route-segments.type.ts';

/** A link's two end centres. */
type Ends = { readonly source: Position; readonly target: Position };

const centreOf = (positions: Positions, id: string): Position | undefined =>
  Object.hasOwn(positions, id) ? positions[id] : undefined;

const endsOf = (positions: Positions, link: GraphEdge): Ends | null => {
  const source = centreOf(positions, link.source);
  const target = centreOf(positions, link.target);

  if (source === undefined || target === undefined) return null;

  const ends: Ends = { source, target };

  return ends;
};

/**
 * The route of a link out of an open umbrella, whose ends moved from `base` to `now`: straight down from the bottom of the
 * umbrella's `box`, at the x its base route left the umbrella by, to where it ends on its target now. The files sit under
 * the umbrella inside the box, so a link leaving the umbrella itself would run through them.
 */
export const openUmbrellaRouteOf = (route: EdgeRoute, base: Ends, now: Ends, box: BoxBounds): EdgeRoute => {
  const startOffset = offsetOf(route.start, base.source);
  const endOffset = offsetOf(route.end, base.target);
  const start: Position = { x: now.source.x + startOffset.x, y: box.y + box.height };
  const end = sumOf(now.target, endOffset);
  const open: EdgeRoute = { start, bends: [], end };

  return open;
};

const linkSegmentsOf = (placement: AtomPlacement, atoms: AtomPositions, link: GraphEdge): RouteSegments | null => {
  const id = edgeIdOf(link);
  const route = Object.hasOwn(placement.routes, id) ? placement.routes[id] : undefined;
  const base = endsOf(placement.base, link);
  const now = endsOf(atoms.positions, link);
  const boxId = `${ATOM_BOX_PREFIX}${link.source}`;
  const box = Object.hasOwn(atoms.boxes, boxId) ? atoms.boxes[boxId] : undefined;

  if (route === undefined || base === null || now === null) return null;

  if (box === undefined) return routeSegmentsOf(route, base.source, base.target);

  const open = openUmbrellaRouteOf(route, base, now, box);

  return routeSegmentsOf(open, now.source, now.target);
};

/**
 * The segments of each routed link out of an umbrella the placement draws, by edge id, once `atoms` placed the nodes: one
 * whose umbrella is open leaves its box's bottom (`openUmbrellaRouteOf`), any other is on its base route again, the
 * segments it was drawn on when placed. A link with no route, an end not placed, or ends that coincide is left out.
 */
export const umbrellaLinkSegmentsOf = (placement: AtomPlacement, atoms: AtomPositions): Map<string, RouteSegments> => {
  const segments = new Map<string, RouteSegments>();
  const isFromUmbrella = (link: GraphEdge): boolean => placement.sizes.has(link.source);
  const umbrellaLinks = placement.links.filter(isFromUmbrella);

  for (const link of umbrellaLinks) {
    const linkSegments = linkSegmentsOf(placement, atoms, link);

    if (linkSegments !== null) segments.set(edgeIdOf(link), linkSegments);
  }

  return segments;
};
