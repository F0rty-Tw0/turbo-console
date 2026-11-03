import cytoscape from 'cytoscape';
import type { Core, EdgeDataDefinition, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { ROUTED_CLASS, ROUTE_RADIUS_PX } from '../common/graph-layout.const.ts';
import { CANVAS_COLORS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

const SEGMENT_DATA = { segWeights: [0.25, 0.75], segDistances: [-40, -40], srcEnd: '0px 16px', tgtEnd: '0px -16px' };

const ROUTED_DATA: EdgeDataDefinition = { id: 'routed', source: 'a', target: 'b', ...SEGMENT_DATA };

const PLAIN_DATA: EdgeDataDefinition = { id: 'plain', source: 'b', target: 'c', ...SEGMENT_DATA };

const ROUTED_ELEMENTS: ElementDefinition[] = [
  canvasNodeOf('a'),
  canvasNodeOf('b'),
  canvasNodeOf('c'),
  { data: ROUTED_DATA, classes: ROUTED_CLASS },
  { data: PLAIN_DATA }
];

describe('FEATURE: routeRulesOf in the graph stylesheet', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: ROUTED_ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN an edge with class routed and segment data', () => {
    it('WHEN styled THEN curve-style is round-segments', () => {
      const curve: unknown = cy.getElementById('routed').style('curve-style');

      expect(curve).toBe('round-segments');
    });

    it('WHEN styled THEN its segment weights and distances are the data arrays', () => {
      const edge = cy.getElementById('routed');

      const segments: unknown[] = [edge.style('segment-weights'), edge.style('segment-distances')];

      expect(segments).toStrictEqual(['0.25 0.75', '-40px -40px']);
    });

    it('WHEN styled THEN its corners round by ROUTE_RADIUS_PX', () => {
      const radii: unknown = cy.getElementById('routed').style('segment-radii');

      expect(radii).toBe(`${ROUTE_RADIUS_PX}`);
    });

    it('WHEN styled THEN its segments are measured from the node centres', () => {
      const distances: unknown = cy.getElementById('routed').style('edge-distances');

      expect(distances).toBe('node-position');
    });

    it('WHEN styled THEN its ends are the data endpoints', () => {
      const edge = cy.getElementById('routed');

      const ends: unknown[] = [edge.style('source-endpoint'), edge.style('target-endpoint')];

      expect(ends).toStrictEqual(['0px 16px', '0px -16px']);
    });
  });

  describe('GIVEN the routed edge also selected', () => {
    beforeEach(() => {
      cy.getElementById('routed').addClass('selected');
      cy.getElementById('plain').addClass('selected');
    });

    it('WHEN styled THEN it stays round-segments', () => {
      const curve: unknown = cy.getElementById('routed').style('curve-style');

      expect(curve).toBe('round-segments');
    });

    it('WHEN styled THEN it takes the selected colour a plain selected edge has', () => {
      const selected: unknown = cy.getElementById('plain').style('line-color');

      const colour: unknown = cy.getElementById('routed').style('line-color');

      expect(colour).toBe(selected);
    });
  });

  describe('GIVEN an edge with segment data but without the class', () => {
    it('WHEN styled THEN curve-style stays bezier', () => {
      const curve: unknown = cy.getElementById('plain').style('curve-style');

      expect(curve).toBe('bezier');
    });
  });
});
