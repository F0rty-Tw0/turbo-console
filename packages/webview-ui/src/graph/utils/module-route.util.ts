import { edgeIdOf } from './edge-id.util.ts';
import { routeSegmentsOf } from './route-segments.util.ts';
import type { Positions, Routes } from '../../bridge/common/graph-state.type.ts';
import type { ModuleSceneLink } from '../common/module-scene.type.ts';
import type { RouteSegments } from '../common/route-segments.type.ts';

/**
 * The data that draws `link` on its ELK route, measured from the centres its cards were laid out at. ELK returns every
 * route in root coordinates (`elk.json.edgeCoords: ROOT`), the frame `nestedCentresOf` adds each box's offset into, so a
 * link between cards in nested boxes needs no shift. `null` with no route (the fallback engine, an unrouted edge) or no
 * centre for an end, so the link draws plain.
 */
export const moduleLinkSegmentsOf = (link: ModuleSceneLink, routes: Routes, positions: Positions): RouteSegments | null => {
  const route = routes[edgeIdOf(link)];
  const source = positions[link.source];
  const target = positions[link.target];

  if (route === undefined || source === undefined || target === undefined) return null;

  return routeSegmentsOf(route, source, target);
};
