import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const AB = edgeIdOf({ source: 'a', target: 'b' });

const BC = edgeIdOf({ source: 'b', target: 'c' });

describe('FEATURE: graphStyleOf edge states', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif'));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the edge a>b has the selected class', () => {
    it('THEN it is 3 wide while a plain edge stays 1', () => {
      cy.getElementById(AB).addClass('selected');

      expect(cy.getElementById(AB).numericStyle('width')).toBe(3);
      expect(cy.getElementById(BC).numericStyle('width')).toBe(1);
    });

    it('THEN its line colour is the selected colour a selected node frames with, not the plain edge colour', () => {
      const edge = cy.getElementById(AB);
      const node = cy.getElementById('a');

      edge.addClass('selected');

      node.addClass('selected');

      expect(edge.style('line-color')).toBe(node.style('border-color'));
      expect(edge.style('line-color')).not.toBe(cy.getElementById(BC).style('line-color'));
    });

    it('THEN its arrow colour is the same selected colour', () => {
      const edge = cy.getElementById(AB);
      const node = cy.getElementById('a');

      edge.addClass('selected');

      node.addClass('selected');

      expect(edge.style('target-arrow-color')).toBe(node.style('border-color'));
    });
  });

  describe('GIVEN the edge b>c has the highlighted class', () => {
    it('THEN it is 2 wide', () => {
      cy.getElementById(BC).addClass('highlighted');

      expect(cy.getElementById(BC).numericStyle('width')).toBe(2);
    });
  });
});
