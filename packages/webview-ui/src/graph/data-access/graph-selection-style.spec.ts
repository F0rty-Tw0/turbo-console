import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { FOCUS_TARGET_CLASS, FOLDER_NODE_CLASS } from '../common/graph.const.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

const EDITOR_FILL = 'rgb(17,17,17)';

const SELECTION_FILL = 'rgb(0,0,255)';

/** `CANVAS_ELEMENTS` and a folder box `apps`, which takes `a` in `beforeEach`. */
const ELEMENTS: ElementDefinition[] = [canvasNodeOf('apps'), ...CANVAS_ELEMENTS];

describe('FEATURE: graphStyleOf selected fill and focus target', () => {
  let cy: Core;
  let node: NodeSingular;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
    node = cy.getElementById('a').move({ parent: 'apps' }).first();
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a package in a theme with selection colours', () => {
    it('WHEN it is selected THEN it takes the selection fill, the selection label colour, bold and border 1.5', () => {
      node.addClass('selected');

      const look = [node.style('background-color'), node.style('color'), node.style('font-weight'), node.numericStyle('border-width')];

      expect(look).toStrictEqual([SELECTION_FILL, 'rgb(255,255,0)', 'bold', 1.5]);
    });

    it('WHEN it is selected and deselected THEN the editor fill and the normal weight return', () => {
      node.addClass('selected').removeClass('selected');

      expect([node.style('background-color'), node.style('font-weight')]).toStrictEqual([EDITOR_FILL, 'normal']);
    });

    it('WHEN it becomes the focus target THEN its label is bold while it is not selected and another stays normal', () => {
      node.addClass(FOCUS_TARGET_CLASS);

      expect([node.style('font-weight'), cy.getElementById('c').style('font-weight')]).toStrictEqual(['bold', 'normal']);
    });
  });

  describe('GIVEN a theme with no selection colours', () => {
    it('WHEN a package is selected THEN it keeps the editor fill and is bold', () => {
      const noSelection = { ...CANVAS_COLORS, selection: null };

      cy.style(graphStyleOf(noSelection, 'sans-serif', false));
      node.addClass('selected');

      expect([node.style('background-color'), node.style('font-weight')]).toStrictEqual([EDITOR_FILL, 'bold']);
    });
  });

  describe('GIVEN a folder', () => {
    it('WHEN its expanded box is selected THEN it keeps the editor fill', () => {
      const box = cy.getElementById('apps').addClass('selected');

      expect(box.style('background-color')).toBe(EDITOR_FILL);
    });

    it('WHEN its collapsed node is selected THEN it gets the selection fill', () => {
      const folder = cy.getElementById('b').addClass(`${FOLDER_NODE_CLASS} selected`);

      expect(folder.style('background-color')).toBe(SELECTION_FILL);
    });
  });
});
