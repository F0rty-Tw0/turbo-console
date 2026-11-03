import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, LayoutOptions } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyRoutes } from './graph-routes.ts';
import type { EdgeRoute, Position, Routes } from '../../bridge/common/graph-state.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import { canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const A_B = edgeIdOf({ source: 'a', target: 'b' });

const A_C = edgeIdOf({ source: 'a', target: 'c' });

const ORIGIN: Position = { x: 0, y: 0 };

const B_AT: Position = { x: 0, y: 200 };

const B_MOVED_AT: Position = { x: 0, y: 100 };

const C_AT: Position = { x: 100, y: 0 };

const B_START: Position = { x: 0, y: 16 };

const B_BENDS: Position[] = [
  { x: 0, y: 50 },
  { x: 20, y: 150 }
];

const B_END: Position = { x: 0, y: 184 };

const C_START: Position = { x: 20, y: 0 };

const C_END: Position = { x: 80, y: 0 };

const A_TO_B: EdgeRoute = { start: B_START, bends: B_BENDS, end: B_END };

const A_TO_C: EdgeRoute = { start: C_START, bends: [], end: C_END };

const ROUTE_A_B: Routes = { [A_B]: A_TO_B };

const ROUTE_A_C: Routes = { [A_C]: A_TO_C };

const BOTH_ROUTES: Routes = { ...ROUTE_A_B, ...ROUTE_A_C };

const NO_ROUTES: Routes = {};

const PRESET_LAYOUT: LayoutOptions = { name: 'preset' };

const nodeAt = (id: string, position: Position): ElementDefinition => {
  const node = canvasNodeOf(id);
  const definition: ElementDefinition = { ...node, position };

  return definition;
};

describe('FEATURE: applyRoutes', () => {
  let cy: Core;

  beforeEach(() => {
    const nodes = [nodeAt('a', ORIGIN), nodeAt('b', B_AT), nodeAt('c', C_AT)];
    const edges = [canvasEdgeOf('a', 'b'), canvasEdgeOf('a', 'c')];
    const elements = [...nodes, ...edges];

    cy = cytoscape({ headless: true, styleEnabled: true, elements, layout: PRESET_LAYOUT });
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a route for a>b only', () => {
    it('WHEN applied THEN a>b has class routed and its segment data', () => {
      applyRoutes(cy, ROUTE_A_B);

      const edge = cy.getElementById(A_B);
      const drawn: unknown[] = [edge.hasClass(ROUTED_CLASS), edge.data('segWeights'), edge.data('segDistances')];
      const ends: unknown[] = [edge.data('srcEnd'), edge.data('tgtEnd')];

      expect(drawn).toStrictEqual([true, [0.25, 0.75], [0, -20]]);
      expect(ends).toStrictEqual(['0px 16px', '0px -16px']);
    });

    it('WHEN applied THEN a>c has no class routed', () => {
      applyRoutes(cy, ROUTE_A_B);

      const isRouted = cy.getElementById(A_C).hasClass(ROUTED_CLASS);

      expect(isRouted).toBe(false);
    });
  });

  describe('GIVEN a>b is routed', () => {
    beforeEach(() => {
      applyRoutes(cy, ROUTE_A_B);
    });

    it('WHEN routes {} are applied THEN a>b loses routed', () => {
      applyRoutes(cy, NO_ROUTES);

      const isRouted = cy.getElementById(A_B).hasClass(ROUTED_CLASS);

      expect(isRouted).toBe(false);
    });

    it('WHEN other routes are applied THEN only those edges are routed', () => {
      applyRoutes(cy, ROUTE_A_C);

      const routed: unknown[] = [cy.getElementById(A_B).hasClass(ROUTED_CLASS), cy.getElementById(A_C).hasClass(ROUTED_CLASS)];

      expect(routed).toStrictEqual([false, true]);
    });
  });

  describe('GIVEN b moved before the apply', () => {
    it('WHEN applied THEN the segments use the moved centre', () => {
      cy.getElementById('b').position(B_MOVED_AT);

      applyRoutes(cy, ROUTE_A_B);

      const edge = cy.getElementById(A_B);
      const drawn: unknown[] = [edge.data('segWeights'), edge.data('segDistances'), edge.data('tgtEnd')];

      expect(drawn).toStrictEqual([[0.5, 1.5], [0, -20], '0px 84px']);
    });
  });

  describe('GIVEN a route whose ends share a centre', () => {
    it('WHEN applied THEN the edge stays straight', () => {
      cy.getElementById('c').position(ORIGIN);

      applyRoutes(cy, ROUTE_A_C);

      const isRouted = cy.getElementById(A_C).hasClass(ROUTED_CLASS);

      expect(isRouted).toBe(false);
    });
  });

  describe('GIVEN 2 routed edges', () => {
    it('WHEN applied THEN one batch is used', () => {
      const batch = vi.spyOn(cy, 'batch');

      applyRoutes(cy, BOTH_ROUTES);

      expect(batch).toHaveBeenCalledOnce();
    });
  });
});
