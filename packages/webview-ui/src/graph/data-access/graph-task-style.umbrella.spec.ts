import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const UMBRELLA_DATA = { id: 'web#build', name: 'lint', label: 'lint', countsText: '10 files · 3 cached · 1 failed' };

const PLAIN_DATA = { id: 'api#build', label: 'build' };

const ELEMENTS: ElementDefinition[] = [
  { data: UMBRELLA_DATA, classes: 'task atom-umbrella' },
  { data: PLAIN_DATA, classes: 'task' }
];

const umbrellaCyOf = (glyphs = false): Core => {
  const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', glyphs);
  const cy = cytoscape({ headless: true, styleEnabled: true, style, elements: ELEMENTS });

  return cy;
};

describe('FEATURE: taskRulesOf umbrellas in graphStyleOf', () => {
  let cy: Core;

  beforeEach(() => {
    cy = umbrellaCyOf();
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN an umbrella node THEN its label is one line, centred 8 px above the node centre', () => {
    const node = cy.getElementById('web#build');

    expect(node.style('text-wrap')).not.toBe('wrap');
    expect(node.numericStyle('text-margin-y')).toBe(-8);
  });

  it('GIVEN a plain task THEN its label has no vertical margin', () => {
    expect(cy.getElementById('api#build').numericStyle('text-margin-y')).toBe(0);
  });
});
