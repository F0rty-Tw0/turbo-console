import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { coreStyleOf } from '../test/utils/graph-stylesheet.spec.util.ts';
import { press } from '../test/utils/press.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const AB = edgeIdOf({ source: 'a', target: 'b' });

describe('FEATURE: graphStyleOf press feedback', () => {
  describe('GIVEN a graph of nodes and edges with the page stylesheet', () => {
    let cy: Core;

    beforeEach(() => {
      cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN a node is pressed THEN its overlay is clear', () => {
      const node = cy.getElementById('a');

      press(node);

      expect(node.numericStyle('overlay-opacity')).toBe(0);
    });

    it('WHEN an edge is pressed THEN its overlay is clear', () => {
      const edge = cy.getElementById(AB);

      press(edge);

      expect(edge.numericStyle('overlay-opacity')).toBe(0);
    });
  });

  describe('GIVEN the page stylesheet', () => {
    it('WHEN its core rule is read THEN it draws no press circle on the background', () => {
      const stylesheet = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);

      const style = coreStyleOf(stylesheet);

      expect(style).toHaveProperty('active-bg-opacity', 0);
    });
  });
});
