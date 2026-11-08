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

/** A link's end centres as the layout placed them and as the open boxes moved them. */
type LinkEnds = { readonly base: Ends; readonly now: Ends };

/** Cytoscape clips the line at the node border for this endpoint; a px offset is drawn as given, which would put the arrow under the node. */
const OUTSIDE_ENDPOINT = 'outside-to-node';

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

/**
 * The segments of a link out of an open umbrella that has no base route, as after a drag straightened it: straight down
 * from the box bottom under the umbrella's centre to its target's centre, clipped at the target's border so the arrow stays
 * outside it. `null` when its ends coincide.
 */
const unroutedOpenSegmentsOf = (now: Ends, box: BoxBounds): RouteSegments | null => {
  const start: Position = { x: now.source.x, y: box.y + box.height };
  const route: EdgeRoute = { start, bends: [], end: now.target };
  const segments = routeSegmentsOf(route, now.source, now.target);

  if (segments === null) return null;

  const clipped: RouteSegments = { ...segments, tgtEnd: OUTSIDE_ENDPOINT };

  return clipped;
};

const openSegmentsOf = (route: EdgeRoute | undefined, ends: LinkEnds, box: BoxBounds): RouteSegments | null => {
  if (route === undefined) return unroutedOpenSegmentsOf(ends.now, box);

  const open = openUmbrellaRouteOf(route, ends.base, ends.now, box);

  return routeSegmentsOf(open, ends.now.source, ends.now.target);
};

const linkSegmentsOf = (
  placement: AtomPlacement,
  boxes: AtomPositions['boxes'],
  link: GraphEdge,
  ends: LinkEnds
): RouteSegments | null => {
  const id = edgeIdOf(link);
  const route = Object.hasOwn(placement.routes, id) ? placement.routes[id] : undefined;
  const boxId = `${ATOM_BOX_PREFIX}${link.source}`;
  const box = Object.hasOwn(boxes, boxId) ? boxes[boxId] : undefined;

  if (box !== undefined) return openSegmentsOf(route, ends, box);

  if (route === undefined) return null;

  return routeSegmentsOf(route, ends.base.source, ends.base.target);
};

/**
 * The segments of each link out of an umbrella the placement draws, by edge id, once `atoms` placed the nodes: one whose
 * umbrella is open leaves its box's bottom (`openUmbrellaRouteOf`, or straight under the umbrella when it has no route),
 * any other is on its base route again, the segments it was drawn on when placed. `null` draws a link straight: one with
 * no route whose umbrella is collapsed, or one whose ends coincide. A link with an end not placed is left out.
 */
export const umbrellaLinkSegmentsOf = (placement: AtomPlacement, atoms: AtomPositions): Map<string, RouteSegments | null> => {
  const segments = new Map<string, RouteSegments | null>();
  const isFromUmbrella = (link: GraphEdge): boolean => placement.sizes.has(link.source);
  const umbrellaLinks = placement.links.filter(isFromUmbrella);

  for (const link of umbrellaLinks) {
    const base = endsOf(placement.base, link);
    const now = endsOf(atoms.positions, link);

    if (base === null || now === null) continue;

    const ends: LinkEnds = { base, now };
    const linkSegments = linkSegmentsOf(placement, atoms.boxes, link, ends);

    segments.set(edgeIdOf(link), linkSegments);
  }

  return segments;
};
