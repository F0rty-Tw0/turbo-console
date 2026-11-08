import type { ElkEdge, ElkNode, ElkPoint } from 'elkjs/lib/elk-api.js';

import { isTitleTieId } from './task-compound.util.ts';
import type { EdgeRoute, Position, Routes } from '../../bridge/common/graph-state.type.ts';
import { ROUTE_BENDS_MAX } from '../common/graph-layout.const.ts';

type RouteEntry = [string, EdgeRoute];

const positionOf = (point: ElkPoint): Position => {
  const position: Position = { x: point.x, y: point.y };

  return position;
};

/** The edge's first section as a route, or no entry for an edge ELK left unrouted or a title tie. */
const routeEntriesOf = (edge: ElkEdge): RouteEntry[] => {
  const section = edge.sections?.[0];
  const isTie = isTitleTieId(edge.id);

  if (section === undefined || isTie) return [];

  const bendPoints = section.bendPoints ?? [];
  const bends = bendPoints.map(positionOf);
  const start = positionOf(section.startPoint);
  const end = positionOf(section.endPoint);
  const route: EdgeRoute = { start, bends, end };

  return [[edge.id, route]];
};

/** The entries of every edge held by `node` or any compound below it. */
const entriesUnder = (node: ElkNode): RouteEntry[] => {
  const edges = node.edges ?? [];
  const children = node.children ?? [];
  const own = edges.flatMap(routeEntriesOf);
  const below = children.flatMap(entriesUnder);

  return [...own, ...below];
};

/**
 * Each routed edge's path by edge id, copied from the laid-out graph. The layout options ask ELK for root coordinates,
 * so the points share the frame `nestedCentresOf` uses whichever compound holds the edge.
 */
export const routesOf = (laidOut: ElkNode): Routes => {
  const entries = entriesUnder(laidOut);

  return Object.fromEntries(entries);
};

const hasPostableBends = ([, route]: RouteEntry): boolean => route.bends.length <= ROUTE_BENDS_MAX;

/** The routes the host keeps: those with at most `ROUTE_BENDS_MAX` bends. `routes` itself stays whole for the page to draw from. */
export const postableRoutesOf = (routes: Routes): Routes => {
  const entries = Object.entries(routes);
  const postable = entries.filter(hasPostableBends);

  return Object.fromEntries(postable);
};

/** `routes` less those of `edgeIds`; an id with no route is ignored and `routes` itself is not changed. */
export const withoutRoutes = (routes: Routes, edgeIds: string[]): Routes => {
  const dropped = new Set(edgeIds);
  const entries = Object.entries(routes);
  const kept = entries.filter(([id]): boolean => !dropped.has(id));

  return Object.fromEntries(kept);
};
