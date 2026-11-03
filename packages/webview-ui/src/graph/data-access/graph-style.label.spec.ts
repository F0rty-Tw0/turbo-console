import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

describe('FEATURE: graphStyleOf package label', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a package node @org/x with the label data x', () => {
    it('THEN it draws x, not its id', () => {
      const node = cy.add(canvasNodeOf('@org/x')).data('label', 'x');

      const label: unknown = node.style('label');

      expect(label).toBe('x');
    });
  });

  describe('GIVEN a node with no label data', () => {
    it('THEN it draws its id', () => {
      const label: unknown = cy.getElementById('a').style('label');

      expect(label).toBe('a');
    });
  });
});
