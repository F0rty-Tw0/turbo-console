import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { FOLDER_NODE_CLASS } from '../common/graph.const.ts';
import { CARD_MEASURES_STUB } from '../test/stubs/graph-card.stub.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const AB = edgeIdOf({ source: 'a', target: 'b' });

const FOLDER_BOX_DATA = { id: 'folder:apps', title: 'apps' };

const FOLDER_BOX: ElementDefinition = { data: FOLDER_BOX_DATA };

const FOLDER_CHILD_DATA = { id: 'site', parent: 'folder:apps' };

const FOLDER_CHILD: ElementDefinition = { data: FOLDER_CHILD_DATA };

const THEMED_COLORS = { ...CANVAS_COLORS, selected: '#00f' };

describe('FEATURE: graphStyleOf corners and arrows', () => {
  let cy: Core;

  beforeEach(() => {
    const elements = [...CANVAS_ELEMENTS, FOLDER_BOX, FOLDER_CHILD];

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false, CARD_MEASURES_STUB));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a plain package node', () => {
    it('THEN its corners are 6 px round', () => {
      expect(cy.getElementById('a').numericStyle('corner-radius')).toBe(6);
    });
  });

  describe('GIVEN a node with packages', () => {
    it('THEN its corners are 8 px round', () => {
      expect(cy.getElementById('folder:apps').numericStyle('corner-radius')).toBe(8);
    });
  });

  describe('GIVEN a collapsed folder node', () => {
    it('THEN its corners are 8 px round', () => {
      const node = cy.getElementById('a');

      node.addClass(FOLDER_NODE_CLASS);

      expect(node.numericStyle('corner-radius')).toBe(8);
    });
  });

  describe('GIVEN a ghost node', () => {
    it('THEN its corners stay 6 px round', () => {
      const node = cy.getElementById('a');

      node.addClass('ghost');

      expect(node.numericStyle('corner-radius')).toBe(6);
    });
  });

  describe.each(['', 'highlighted', 'selected'])('GIVEN an edge classed "%s"', (className) => {
    it('THEN its arrow is 0.8 scaled and 3 px clear of the node', () => {
      const edge = cy.getElementById(AB);

      edge.addClass(className);

      expect([edge.numericStyle('arrow-scale'), edge.numericStyle('target-distance-from-node')]).toStrictEqual([0.8, 3]);
    });
  });

  describe('GIVEN another theme applied again', () => {
    it('THEN the corners and the selected width are unchanged', () => {
      const node = cy.getElementById('a');
      const edge = cy.getElementById(AB);

      cy.style(graphStyleOf(THEMED_COLORS, 'sans-serif', false, CARD_MEASURES_STUB));
      node.addClass('selected');
      edge.addClass('selected');

      expect([node.numericStyle('corner-radius'), node.numericStyle('border-width'), edge.numericStyle('width')]).toStrictEqual([
        6, 1.5, 1.5
      ]);
    });
  });
});
