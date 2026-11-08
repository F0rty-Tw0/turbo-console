import type { ElkEdge, ElkEdgeSection, ElkNode } from 'elkjs/lib/elk-api.js';
import elkConstructor from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';

import { edgeIdOf } from './edge-id.util.ts';
import { nestedCentresOf } from './elk-centres.util.ts';
import { elkGraphOf } from './elk-graph.util.ts';
import { postableRoutesOf, routesOf, withoutRoutes } from './elk-routes.util.ts';
import type { EdgeRoute, GraphEdge, Position, Positions, Routes } from '../../bridge/common/graph-state.type.ts';
import { ROUTE_BENDS_MAX } from '../common/graph-layout.const.ts';
import { REAL_ELK_TIMEOUT_MS } from '../test/common/real-elk.const.ts';
import { BOARDS_SIZE_STUB } from '../test/stubs/folder-boards.stub.ts';
import { ROUTED_ELK_STUB, ROUTES_STUB } from '../test/stubs/layout.stub.ts';
import { BOARDS_EDGES, boardsSizeOf, layoutBoards } from '../test/utils/folder-boards.spec.util.ts';
import { packedEdgeIds, packedTaskGraphOf, startGapsOf } from '../test/utils/packed-routes.spec.util.ts';
import { routeWithBends } from '../test/utils/route-bends.spec.util.ts';

const NOWHERE: Position = { x: NaN, y: NaN };
const NO_ROUTE: EdgeRoute = { start: NOWHERE, bends: [], end: NOWHERE };
const TOP_POINT: Position = { x: 0, y: 0 };
const BOTTOM_POINT: Position = { x: 0, y: 10 };
const SECTION: ElkEdgeSection = { id: 's', startPoint: TOP_POINT, endPoint: BOTTOM_POINT };
const SECTIONED_EDGE: ElkEdge = { id: 'e', sources: ['a'], targets: ['b'], sections: [SECTION] };
const BENT_BEND: Position = { x: 0, y: 5 };
const BENT_SECTION: ElkEdgeSection = { ...SECTION, bendPoints: [BENT_BEND] };
const BENT_EDGE: ElkEdge = { ...SECTIONED_EDGE, sections: [BENT_SECTION] };
const BENT_ROOT: ElkNode = { id: 'root', edges: [BENT_EDGE] };
const UNROUTED_EDGE: ElkEdge = { id: 'e', sources: ['a'], targets: ['b'] };
const UNROUTED_ROOT: ElkNode = { id: 'root', children: [], edges: [UNROUTED_EDGE] };
const INNER_COMPOUND: ElkNode = { id: 'g', edges: [SECTIONED_EDGE] };
const OUTER_COMPOUND: ElkNode = { id: 'f', children: [INNER_COMPOUND] };
const NESTED_ROOT: ElkNode = { id: 'root', children: [OUTER_COMPOUND] };
const UI_UTILS: GraphEdge = { source: '@acme/ui', target: '@acme/utils' };
const A_B: GraphEdge = { source: 'a', target: 'b' };

/** NaN stands in for a missing entry, so a lookup that finds nothing fails every comparison. */
const centreOf = (positions: Positions, name: string): Position => positions[name] ?? NOWHERE;

const routeOf = (routes: Routes, edge: GraphEdge): EdgeRoute => routes[edgeIdOf(edge)] ?? NO_ROUTE;

describe('FEATURE: routesOf', () => {
  describe('GIVEN the boards fixture laid out by real elkjs', { timeout: REAL_ELK_TIMEOUT_MS }, () => {
    it('WHEN routes are read THEN ui -> utils starts at the centre x of ui (a1)', async () => {
      const laidOut = await layoutBoards();
      const ui = centreOf(nestedCentresOf(laidOut), '@acme/ui');
      const route = routeOf(routesOf(laidOut), UI_UTILS);

      expect(route.start.x).toBeCloseTo(ui.x, 0);
    });

    it('WHEN routes are read THEN ui -> utils starts at the bottom edge of ui in root coordinates (a1)', async () => {
      const laidOut = await layoutBoards();
      const ui = centreOf(nestedCentresOf(laidOut), '@acme/ui');
      const route = routeOf(routesOf(laidOut), UI_UTILS);
      const bottom = ui.y + BOARDS_SIZE_STUB.height / 2;

      expect(route.start.y).toBeCloseTo(bottom, 0);
    });

    it('WHEN routes are read THEN every one of its edges has a route', async () => {
      const laidOut = await layoutBoards();
      const ids = BOARDS_EDGES.map(edgeIdOf);
      const routedIds = Object.keys(routesOf(laidOut));

      expect(routedIds.toSorted()).toStrictEqual(ids.toSorted());
    });
  });

  describe('GIVEN two packages a -> b laid out by real elkjs', { timeout: REAL_ELK_TIMEOUT_MS }, () => {
    const laidOutAb = async (): Promise<ElkNode> => {
      const graph = elkGraphOf(['a', 'b'], [A_B], boardsSizeOf);

      return new elkConstructor().layout(graph);
    };

    it('WHEN read THEN the route has no bends (a5)', async () => {
      const routes = routesOf(await laidOutAb());

      expect(routeOf(routes, A_B).bends).toStrictEqual([]);
    });

    it('WHEN read THEN the route still exists (a5)', async () => {
      const routes = routesOf(await laidOutAb());

      expect(Object.keys(routes)).toStrictEqual([edgeIdOf(A_B)]);
    });
  });

  describe('GIVEN a packed task graph of two components laid out by real elkjs', { timeout: REAL_ELK_TIMEOUT_MS }, () => {
    it('WHEN routes are read THEN every edge has a route starting on its source box in root coordinates (c10)', async () => {
      const input = packedTaskGraphOf();
      const elk = new elkConstructor();
      const laidOut = await elk.layout(input);

      const routes = routesOf(laidOut);

      const ids = Object.keys(routes);

      expect(ids.toSorted()).toStrictEqual(packedEdgeIds().toSorted());
      expect(startGapsOf(laidOut, routes)).toStrictEqual([0, 0]);
    });
  });

  describe('GIVEN an edge with no sections', () => {
    it('WHEN read THEN it has no route (a5)', () => {
      const routes = routesOf(UNROUTED_ROOT);

      expect(routes).toStrictEqual({});
    });
  });

  describe('GIVEN an edge inside a nested compound', () => {
    it('WHEN read THEN it is found at every depth', () => {
      const ids = Object.keys(routesOf(NESTED_ROOT));

      expect(ids).toStrictEqual(['e']);
    });
  });

  describe('GIVEN a section with a bend', () => {
    it('WHEN read THEN the route shares no point object with it', () => {
      const [route = NO_ROUTE] = Object.values(routesOf(BENT_ROOT));
      const [bend] = route.bends;

      expect(route.start).not.toBe(BENT_SECTION.startPoint);
      expect(bend).not.toBe(BENT_BEND);
      expect(route.end).not.toBe(BENT_SECTION.endPoint);
    });

    it('WHEN read THEN start, bends and end are copied exactly', () => {
      const routes = routesOf(ROUTED_ELK_STUB);

      expect(routes).toStrictEqual(ROUTES_STUB);
    });
  });
});

describe('FEATURE: routesOf with a titled-row box', () => {
  describe('GIVEN a box whose title tie ELK routed beside a routed link', () => {
    const tie: ElkEdge = { id: 'title-tie:api', sources: ['title-slot:api'], targets: ['api#build'], sections: [SECTION] };
    const box: ElkNode = { id: 'pkg:api', edges: [tie] };
    const laidOut: ElkNode = { id: 'root', children: [box], edges: [SECTIONED_EDGE] };

    it('WHEN the routes are read THEN the link has one and the tie has none', () => {
      expect(Object.keys(routesOf(laidOut))).toStrictEqual(['e']);
    });
  });
});

describe('FEATURE: postableRoutesOf', () => {
  describe('GIVEN a route with exactly ROUTE_BENDS_MAX bends', () => {
    it('WHEN filtered THEN it is kept', () => {
      const routes: Routes = { e: routeWithBends(ROUTE_BENDS_MAX) };

      expect(postableRoutesOf(routes)).toStrictEqual(routes);
    });
  });

  describe('GIVEN a route with one bend more than ROUTE_BENDS_MAX', () => {
    it('WHEN filtered THEN only the other routes are kept', () => {
      const kept = routeWithBends(1);
      const routes: Routes = { long: routeWithBends(ROUTE_BENDS_MAX + 1), kept };

      expect(postableRoutesOf(routes)).toStrictEqual({ kept });
    });

    it('WHEN filtered THEN the input still holds every route', () => {
      const routes: Routes = { long: routeWithBends(ROUTE_BENDS_MAX + 1) };

      postableRoutesOf(routes);

      expect(Object.keys(routes)).toStrictEqual(['long']);
    });
  });
});

describe('FEATURE: withoutRoutes', () => {
  describe('GIVEN routes for a>b and b>c', () => {
    const ab = routeWithBends(1);
    const bc = routeWithBends(2);
    const routes: Routes = { 'a>b': ab, 'b>c': bc };

    it('WHEN b>c is dropped THEN a>b is kept and the input still holds both', () => {
      expect(withoutRoutes(routes, ['b>c'])).toStrictEqual({ 'a>b': ab });
      expect(Object.keys(routes)).toStrictEqual(['a>b', 'b>c']);
    });

    it('WHEN an id with no route is dropped THEN every route is kept', () => {
      expect(withoutRoutes(routes, ['c>d'])).toStrictEqual(routes);
    });
  });
});
