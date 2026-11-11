import cytoscape from 'cytoscape';
import type { Core, StylesheetJsonBlock } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { taskRulesOf } from './graph-task-style.ts';
import type { GraphAffectedMark } from '../../bridge/common/graph-affected.type.ts';
import { CANVAS_AFFECTED_RGB, CANVAS_COLORS, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';

const HALO_OPACITIES: [GraphAffectedMark, number][] = [
  ['changed', 0.4],
  ['dependency', 0.18]
];

const RULES: StylesheetJsonBlock[] = taskRulesOf(CANVAS_COLORS, {}, null);

const SELECTORS: string[] = RULES.map((rule) => rule.selector);

const styleOf = (selector: string): unknown => {
  const isSelector = (rule: StylesheetJsonBlock): boolean => rule.selector === selector;
  const rule = RULES.find(isSelector);

  if (rule === undefined || !('style' in rule)) return undefined;

  return rule.style;
};

describe('FEATURE: taskRulesOf affected halos', () => {
  describe('GIVEN the task rules', () => {
    it.each(HALO_OPACITIES)('WHEN node.affected-%s is read THEN it has the affected underlay at %f, padded 6', (mark, opacity) => {
      const style = styleOf(`node.affected-${mark}`);

      expect(style).toStrictEqual({ 'underlay-color': CANVAS_COLORS.affected, 'underlay-opacity': opacity, 'underlay-padding': 6 });
    });

    it.each(HALO_OPACITIES)(
      'WHEN node.dimmed.affected-%s is read THEN its opacity %f is multiplied by dimmedOpacity',
      (mark, opacity) => {
        const style = styleOf(`node.dimmed.affected-${mark}`);

        expect(style).toStrictEqual({ 'underlay-opacity': opacity * CANVAS_COLORS.dimmedOpacity });
      }
    );

    it('WHEN the order is read THEN the dimmed rules come after the base halo rules', () => {
      const dimmedAt = SELECTORS.indexOf('node.dimmed.affected-changed');
      const baseAt = SELECTORS.indexOf('node.affected-dependency');

      expect(dimmedAt).toBeGreaterThan(baseAt);
    });
  });

  describe('GIVEN a styled canvas with one node', () => {
    let cy: Core;

    beforeEach(() => {
      const elements = [canvasNodeOf('app#build')];
      const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);

      cy = cytoscape({ headless: true, styleEnabled: true, elements, style });
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN it carries no affected class THEN its underlay is transparent', () => {
      expect(cy.getElementById('app#build').numericStyle('underlay-opacity')).toBe(0);
    });

    it.each(HALO_OPACITIES)('WHEN it carries affected-%s THEN its underlay draws the affected colour at %f', (mark, opacity) => {
      const node = cy.getElementById('app#build').addClass(`affected-${mark}`);

      expect([node.style('underlay-color'), node.numericStyle('underlay-opacity')]).toStrictEqual([CANVAS_AFFECTED_RGB, opacity]);
    });

    it.each(HALO_OPACITIES)('WHEN it is dimmed and carries affected-%s THEN its underlay fades with it', (mark, opacity) => {
      const node = cy.getElementById('app#build').addClass(`dimmed affected-${mark}`);

      expect(node.numericStyle('underlay-opacity')).toBeCloseTo(opacity * CANVAS_COLORS.dimmedOpacity);
    });

    it('WHEN it carries affected-changed THEN its underlay is padded 6 px', () => {
      const node = cy.getElementById('app#build').addClass('affected-changed');

      expect(node.numericStyle('underlay-padding')).toBe(6);
    });
  });
});
