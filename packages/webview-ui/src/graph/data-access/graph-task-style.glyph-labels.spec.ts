import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CARD_MEASURES_STUB } from '../test/stubs/graph-card.stub.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const glyphElementOf = (id: string, label: string, classes: string): ElementDefinition => {
  const data = { id, label, width: 80, height: 22 };
  const definition: ElementDefinition = { data, classes };

  return definition;
};

const GLYPH_ELEMENTS = [
  glyphElementOf('web#build', 'build', 'task'),
  glyphElementOf('web#lint', 'lint', 'task atom-umbrella'),
  glyphElementOf('web#build--a.ts', 'a.ts', 'atom-file atom-cached run-running'),
  glyphElementOf('web#build--more', '+3 more', 'atom-more'),
  glyphElementOf('pkg:web', 'web', '')
];

describe('FEATURE: taskRulesOf glyph labels in graphStyleOf with glyphs on', () => {
  let cy: Core;

  const labelOf = (id: string): string => String(cy.getElementById(id).style('label'));

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: GLYPH_ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', true, CARD_MEASURES_STUB));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a task node with no state', () => {
    it('THEN its label is the blank slot, a space and its name', () => {
      expect(labelOf('web#build')).toBe('\uec03 build');
    });
  });

  describe('GIVEN a task node', () => {
    it('WHEN it runs and then stops THEN its glyph follows and its width stays', () => {
      const node = cy.getElementById('web#build');
      const width: unknown = node.data('width');

      node.addClass('run-running');

      expect(labelOf('web#build')).toBe('\uea77 build');
      expect(node.data('width')).toBe(width);

      node.removeClass('run-running').addClass('run-stopped');

      expect(labelOf('web#build')).toBe('\uead7 build');
      expect(node.data('width')).toBe(width);
    });

    it('THEN its font list puts codicon before the body font', () => {
      expect(cy.getElementById('web#build').style('font-family')).toBe('codicon, sans-serif');
    });
  });

  describe('GIVEN an umbrella node', () => {
    it('THEN the glyph leads its name', () => {
      expect(labelOf('web#lint')).toBe('\uec03 lint');
    });
  });

  describe('GIVEN a cached file that is running', () => {
    it('THEN its label starts with the sync glyph, not history', () => {
      expect(labelOf('web#build--a.ts')).toBe('\uea77 a.ts');
    });
  });

  describe('GIVEN an atom-more node', () => {
    it('THEN its label is its data label', () => {
      expect(labelOf('web#build--more')).toBe('+3 more');
    });

    it('THEN its font list has no codicon', () => {
      expect(cy.getElementById('web#build--more').style('font-family')).not.toContain('codicon');
    });
  });

  describe('GIVEN a package node with no task class', () => {
    it('THEN its font is the body font', () => {
      expect(cy.getElementById('pkg:web').style('font-family')).toBe('sans-serif');
    });
  });

  describe('GIVEN a passed task', () => {
    it('WHEN the theme is applied again THEN its label and width are unchanged', () => {
      const node = cy.getElementById('web#build');

      node.addClass('run-passed');
      cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', true, CARD_MEASURES_STUB));

      expect(labelOf('web#build')).toBe('\ueba4 build');
      expect(node.data('width')).toBe(80);
    });
  });
});
