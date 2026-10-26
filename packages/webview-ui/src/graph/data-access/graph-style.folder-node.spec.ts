import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { EXPORTING_CLASS, FOLDER_NODE_CLASS, ROW_LESS_CLASS } from '../common/graph.const.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';

const LABEL = 'apps\n2 packages';

describe('FEATURE: graphStyleOf collapsed folder label', () => {
  describe('GIVEN a folder-node with its two-line label data', () => {
    let cy: Core;
    let node: NodeSingular;

    beforeEach(() => {
      cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
      node = cy.getElementById('a').data('label', LABEL).addClass(FOLDER_NODE_CLASS);
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN it has its header row THEN it draws no label', () => {
      const label: unknown = node.style('label');

      expect(label).toBe('');
    });

    describe('WHEN exporting', () => {
      beforeEach(() => {
        node.addClass(EXPORTING_CLASS);
      });

      it('THEN it draws its label data', () => {
        expect(node.style('label')).toBe(LABEL);
      });

      it('THEN the label wraps at 116 px', () => {
        expect([node.style('text-wrap'), node.style('text-max-width')]).toStrictEqual(['wrap', '116px']);
      });
    });

    describe('WHEN it is row-less', () => {
      beforeEach(() => {
        node.addClass(ROW_LESS_CLASS);
      });

      it('THEN it draws its label data', () => {
        expect(node.style('label')).toBe(LABEL);
      });

      it('THEN the label wraps at 116 px', () => {
        expect([node.style('text-wrap'), node.style('text-max-width')]).toStrictEqual(['wrap', '116px']);
      });
    });
  });
});
