import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CARD_MEASURES_STUB } from '../test/stubs/graph-card.stub.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const AB = edgeIdOf({ source: 'a', target: 'b' });

/** A high contrast theme's raised dim, which no 0.25 default could stand in for. */
const RAISED_DIM_COLORS = { ...CANVAS_COLORS, dimmedOpacity: 0.55 };

describe('FEATURE: graphStyleOf dimmed opacity', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
    cy.style(graphStyleOf(RAISED_DIM_COLORS, 'sans-serif', false, CARD_MEASURES_STUB));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN colours with a 0.55 dim', () => {
    it('WHEN a node and an edge are dimmed THEN both are 0.55 opaque', () => {
      const node = cy.getElementById('a');
      const edge = cy.getElementById(AB);

      node.addClass('dimmed');
      edge.addClass('dimmed');

      expect([node.numericStyle('opacity'), edge.numericStyle('opacity')]).toStrictEqual([0.55, 0.55]);
    });

    it('WHEN a node is a dimmed-box THEN its frame, label and fill are 0.55 opaque', () => {
      const node = cy.getElementById('a');

      node.addClass('dimmed-box');

      const opacities = [
        node.numericStyle('border-opacity'),
        node.numericStyle('text-opacity'),
        node.numericStyle('background-opacity')
      ];

      expect(opacities).toStrictEqual([0.55, 0.55, 0.55]);
    });
  });
});
