import type { Core, EdgeSingular } from 'cytoscape';

import type { EdgeRoute, Routes } from '../../bridge/common/graph-state.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import { routeSegmentsOf } from '../utils/route-segments.util.ts';

const drawOnRoute = (edge: EdgeSingular, route: EdgeRoute): void => {
  const segments = routeSegmentsOf(route, edge.source().position(), edge.target().position());

  if (segments === null) {
    edge.removeClass(ROUTED_CLASS);

    return;
  }

  edge.data(segments);
  edge.addClass(ROUTED_CLASS);
};

const applyRouteTo = (edge: EdgeSingular, routes: Routes): void => {
  const route = routes[edge.id()];

  if (route === undefined) {
    edge.removeClass(ROUTED_CLASS);

    return;
  }

  drawOnRoute(edge, route);
};

/**
 * Draws each edge that has a route on it (`ROUTED_CLASS` and the segment data) and every other edge straight again. The
 * segments are measured from the centres Cytoscape holds now, so call it after the positions are set.
 */
export const applyRoutes = (cy: Core, routes: Routes): void => {
  cy.batch((): void => {
    cy.edges().forEach((edge: EdgeSingular): void => applyRouteTo(edge, routes));
  });
};
