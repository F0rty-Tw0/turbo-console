import type { ElkNode } from 'elkjs/lib/elk-api.js';
import elkConstructor from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';

import { edgeIdOf } from './edge-id.util.ts';
import { nestedCentresOf } from './elk-centres.util.ts';
import { elkModuleGraphOf } from './elk-module-graph.util.ts';
import { routesOf } from './elk-routes.util.ts';
import { moduleLinkSegmentsOf } from './module-route.util.ts';
import { moduleSceneOf } from './module-scene.util.ts';
import { moduleTreeOf } from './module-tree.util.ts';
import type { EdgeRoute, Position, Positions, Routes } from '../../bridge/common/graph-state.type.ts';
import type { ModuleScene, ModuleSceneLink } from '../common/module-scene.type.ts';
import { REAL_ELK_TIMEOUT_MS } from '../test/common/real-elk.const.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB, MODULE_MEASURES_STUB } from '../test/stubs/module-scene.stub.ts';
import { NODE_SIZE_STUB } from '../test/stubs/node-size.stub.ts';

/** The root box holds src, which holds the lib and ui boxes: three levels of nesting, and stubs at the root. */
const NESTED_SCENE: ModuleScene = moduleSceneOf(moduleTreeOf(MODULES_FOUND_STUB.files), MODULES_FOUND_STUB, {
  expanded: ['src', 'src/lib', 'src/ui'],
  shown: ALL_SHOWN_STUB
});

const A_B: ModuleSceneLink = { source: 'file:src/a.ts', target: 'file:src/lib/b.ts', statics: 1, types: 0, lazies: 0 };

const A_BOTTOM: Position = { x: 0, y: 16 };

const B_TOP: Position = { x: 0, y: 84 };

const A_B_ROUTE: EdgeRoute = { start: A_BOTTOM, bends: [], end: B_TOP };

const A_B_ROUTES: Routes = { [edgeIdOf(A_B)]: A_B_ROUTE };

const A_CENTRE: Position = { x: 0, y: 0 };

const B_CENTRE: Position = { x: 0, y: 100 };

const A_B_PLACED: Positions = { [A_B.source]: A_CENTRE, [A_B.target]: B_CENTRE };

const ONLY_B: Positions = { [A_B.target]: B_CENTRE };

const ONLY_A: Positions = { [A_B.source]: A_CENTRE };

const BORDER_DIGITS = 1;

type LaidOutModules = {
  readonly routes: Routes;
  readonly positions: Positions;
};

const laidOutNested = async (): Promise<LaidOutModules> => {
  const graph = elkModuleGraphOf(NESTED_SCENE, MODULE_MEASURES_STUB);
  const laidOut: ElkNode = await new elkConstructor().layout(graph);
  const routes = routesOf(laidOut);
  const positions = nestedCentresOf(laidOut);
  const result: LaidOutModules = { routes, positions };

  return result;
};

/** How far `point` lies off the border of the `NODE_SIZE_STUB` card centred at `centre`, inside or out, to 0.1 px; NaN with no card. */
const borderGapOf = (point: Position, centre: Position | undefined): number => {
  if (centre === undefined) return NaN;

  const dx = Math.abs(point.x - centre.x) - NODE_SIZE_STUB.width / 2;
  const dy = Math.abs(point.y - centre.y) - NODE_SIZE_STUB.height / 2;
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const inside = Math.max(-Math.max(dx, dy), 0);
  const gap = Math.max(outside, inside);

  return Number(gap.toFixed(BORDER_DIGITS)) + 0;
};

/** Per link of `NESTED_SCENE`, how far its route's start and end lie off the borders of its source and target cards. */
const endGapsOf = (laid: LaidOutModules): number[][] => {
  const gapsOf = (link: ModuleSceneLink): number[] => {
    const route = laid.routes[edgeIdOf(link)];

    if (route === undefined) return [NaN, NaN];

    return [borderGapOf(route.start, laid.positions[link.source]), borderGapOf(route.end, laid.positions[link.target])];
  };

  return NESTED_SCENE.links.map(gapsOf);
};

describe('FEATURE: moduleLinkSegmentsOf', () => {
  describe('GIVEN cards in nested boxes laid out by real elkjs', { timeout: REAL_ELK_TIMEOUT_MS }, () => {
    it('WHEN each link is read THEN its route starts and ends on its cards, in the frame of their centres', async () => {
      const laid = await laidOutNested();
      const onBorders = NESTED_SCENE.links.map((): number[] => [0, 0]);

      const gaps = endGapsOf(laid);

      expect(gaps).toStrictEqual(onBorders);
    });

    it('WHEN each link is mapped THEN every one gets segments', async () => {
      const laid = await laidOutNested();

      const segments = NESTED_SCENE.links.map((link) => moduleLinkSegmentsOf(link, laid.routes, laid.positions));

      expect(segments).not.toContain(null);
    });
  });

  describe('GIVEN a link a → b with a route and both centres', () => {
    it('WHEN mapped THEN its ends are measured from the centres and its one bend sits halfway', () => {
      const segments = moduleLinkSegmentsOf(A_B, A_B_ROUTES, A_B_PLACED);

      expect(segments).toStrictEqual({ segWeights: [0.5], segDistances: [0], srcEnd: '0px 16px', tgtEnd: '0px -16px' });
    });

    it('WHEN the routes hold none for it THEN it has no segments', () => {
      const segments = moduleLinkSegmentsOf(A_B, {}, A_B_PLACED);

      expect(segments).toBeNull();
    });

    it('WHEN its source has no centre THEN it has no segments', () => {
      const segments = moduleLinkSegmentsOf(A_B, A_B_ROUTES, ONLY_B);

      expect(segments).toBeNull();
    });

    it('WHEN its target has no centre THEN it has no segments', () => {
      const segments = moduleLinkSegmentsOf(A_B, A_B_ROUTES, ONLY_A);

      expect(segments).toBeNull();
    });
  });
});
