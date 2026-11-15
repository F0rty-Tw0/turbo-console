import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CARD_MEASURES_STUB } from '../test/stubs/graph-card.stub.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const boxOf = (id: string, title: string): ElementDefinition => {
  const data = { id, title };
  const definition: ElementDefinition = { data, classes: 'task-box' };

  return definition;
};

const ATOM_OUTLINES: [string, string][] = [
  ['atom-passed', 'rgb(0,255,17)'],
  ['atom-failed', 'rgb(255,0,17)'],
  ['atom-cached', 'rgb(170,0,255)']
];

describe('FEATURE: taskRulesOf Atomizer files and boxes in graphStyleOf', () => {
  let cy: Core;

  beforeEach(() => {
    const box = boxOf('atom:web#e2e-ci', 'web#e2e-ci');
    const data = { id: 'web#e2e-ci--a b/c.spec.ts', label: 'c.spec.ts', parent: 'atom:web#e2e-ci' };
    const file: ElementDefinition = { data, classes: 'atom-file' };

    const boxElement: ElementDefinition = { ...box, classes: 'atom-box' };
    const elements = [boxElement, file];

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false, CARD_MEASURES_STUB));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN an atom file', () => {
    it('THEN its label is its data label, cut with an ellipsis at 88 px, clear of both round pill ends', () => {
      const file = cy.getElementById('web#e2e-ci--a b/c.spec.ts');

      expect([file.style('label'), file.style('text-wrap'), file.numericStyle('text-max-width')]).toStrictEqual([
        'c.spec.ts',
        'ellipsis',
        88
      ]);
    });
  });

  describe('GIVEN an atom file with no outcome class', () => {
    it('THEN it has no outline', () => {
      expect(cy.getElementById('web#e2e-ci--a b/c.spec.ts').numericStyle('outline-width')).toBe(0);
    });
  });

  describe.each(ATOM_OUTLINES)('GIVEN an atom file classed %s', (className, rgb) => {
    it(`THEN it has a 2 wide outline in ${rgb}`, () => {
      const file = cy.getElementById('web#e2e-ci--a b/c.spec.ts');

      file.addClass(className);

      expect(file.numericStyle('outline-width')).toBe(2);
      expect(file.style('outline-color')).toBe(rgb);
    });
  });

  describe('GIVEN a failed atom file that is running', () => {
    it('THEN the run colour wins over the outcome one', () => {
      const file = cy.getElementById('web#e2e-ci--a b/c.spec.ts');

      file.addClass('atom-failed run-running');

      expect(file.style('outline-color')).toBe('rgb(255,255,0)');
    });
  });

  describe('GIVEN a live atom file', () => {
    it('THEN its border is dashed, and a file that is not live keeps a solid one', () => {
      const file = cy.getElementById('web#e2e-ci--a b/c.spec.ts');

      expect(file.style('border-style')).toBe('solid');

      file.addClass('atom-live');

      expect(file.style('border-style')).toBe('dashed');
    });
  });

  describe('GIVEN a live atom file with an outcome', () => {
    it('THEN its outline is dashed too, so the outline does not hide the dashed border', () => {
      const file = cy.getElementById('web#e2e-ci--a b/c.spec.ts');

      file.addClass('atom-passed');

      expect(file.style('outline-style')).toBe('solid');

      file.addClass('atom-live');

      expect(file.style('outline-style')).toBe('dashed');
    });
  });

  describe('GIVEN an atom box', () => {
    it('THEN it pads its content 12 px, sizes without its descendants’ labels and draws no label', () => {
      const box = cy.getElementById('atom:web#e2e-ci');

      expect([box.numericStyle('padding'), box.style('compound-sizing-wrt-labels'), box.style('label')]).toStrictEqual([
        12,
        'exclude',
        ''
      ]);
    });
  });
});
