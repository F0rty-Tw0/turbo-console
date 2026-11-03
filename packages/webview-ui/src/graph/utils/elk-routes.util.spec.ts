import type { ElkEdge, ElkEdgeSection, ElkNode } from 'elkjs/lib/elk-api.js';
import elkConstructor from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';

import { edgeIdOf } from './edge-id.util.ts';
import { nestedCentresOf } from './elk-centres.util.ts';
import { elkGraphOf } from './elk-graph.util.ts';
import { routesOf } from './elk-routes.util.ts';
import type { EdgeRoute, GraphEdge, Position, Positions, Routes } from '../../bridge/common/graph-state.type.ts';
import { BOARDS_SIZE_STUB } from '../test/stubs/folder-boards.stub.ts';
import { ROUTED_ELK_STUB, ROUTES_STUB } from '../test/stubs/layout.stub.ts';
import { BOARDS_EDGES, boardsSizeOf, layoutBoards } from '../test/utils/folder-boards.spec.util.ts';

const NOWHERE: Position = { x: NaN, y: NaN };

const NO_ROUTE: EdgeRoute = { start: NOWHERE, bends: [], end: NOWHERE };

const TOP_POINT: Position = { x: 0, y: 0 };

const BOTTOM_POINT: Position = { x: 0, y: 10 };

const SECTION: ElkEdgeSection = { id: 's', startPoint: TOP_POINT, endPoint: BOTTOM_POINT };

const SECTIONED_EDGE: ElkEdge = { id: 'e', sources: ['a'], targets: ['b'], sections: [SECTION] };

const UNROUTED_EDGE: ElkEdge = { id: 'e', sources: ['a'], targets: ['b'] };

const SECTIONED_ROOT: ElkNode = { id: 'root', edges: [SECTIONED_EDGE] };

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
  describe('GIVEN the boards fixture laid out by real elkjs', () => {
    it('WHEN routes are read THEN ui -> utils starts at the centre x of ui (a1)', async () => {
      const laidOut = await layoutBoards();
      const ui = centreOf(nestedCentresOf(laidOut), '@acme/ui');
      const route = routeOf(routesOf(laidOut), UI_UTILS);

      expect(Math.abs(route.start.x - ui.x)).toBeLessThan(1);
    });

    it('WHEN routes are read THEN ui -> utils starts at the bottom edge of ui in root coordinates (a1)', async () => {
      const laidOut = await layoutBoards();
      const ui = centreOf(nestedCentresOf(laidOut), '@acme/ui');
      const route = routeOf(routesOf(laidOut), UI_UTILS);
      const bottom = ui.y + BOARDS_SIZE_STUB.height / 2;

      expect(Math.abs(route.start.y - bottom)).toBeLessThan(1);
    });

    it('WHEN routes are read THEN every one of its edges has a route', async () => {
      const laidOut = await layoutBoards();
      const ids = BOARDS_EDGES.map(edgeIdOf);

      expect(Object.keys(routesOf(laidOut)).toSorted()).toStrictEqual(ids.toSorted());
    });
  });

  describe('GIVEN two packages a -> b laid out by real elkjs', () => {
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

  describe('GIVEN an edge with no sections', () => {
    it('WHEN read THEN it has no route (a5)', () => {
      expect(routesOf(UNROUTED_ROOT)).toStrictEqual({});
    });
  });

  describe('GIVEN an edge inside a nested compound', () => {
    it('WHEN read THEN it is found at every depth', () => {
      expect(Object.keys(routesOf(NESTED_ROOT))).toStrictEqual(['e']);
    });
  });

  describe('GIVEN a section with a bend', () => {
    it('WHEN read THEN start, bends and end are copied exactly', () => {
      expect(routesOf(ROUTED_ELK_STUB)).toStrictEqual(ROUTES_STUB);
    });
  });

  describe('GIVEN a section', () => {
    it('WHEN read THEN the route shares no point object with it', () => {
      const [route = NO_ROUTE] = Object.values(routesOf(SECTIONED_ROOT));

      expect(route.start).not.toBe(TOP_POINT);
    });
  });
});
