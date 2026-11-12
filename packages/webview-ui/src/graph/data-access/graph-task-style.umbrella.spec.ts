import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { styleTextOf } from '../test/utils/folder-boxes.spec.util.ts';

/** The codicon blank state glyph, U+EC03, built from its code point so no private-use character sits in the source. */
const BLANK_GLYPH = String.fromCodePoint(0xec03);

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

  it('GIVEN an umbrella THEN it draws its name alone until exporting is on', () => {
    expect(styleTextOf(cy, 'web#build', 'label')).toBe('lint');
  });

  it('GIVEN an exporting umbrella without a glyph family THEN it draws name over counts, wrapped, with no vertical margin', () => {
    const node = cy.getElementById('web#build');

    node.addClass('exporting');

    expect(styleTextOf(cy, 'web#build', 'label')).toBe('lint\n10 files · 3 cached · 1 failed');
    expect(node.style('text-wrap')).toBe('wrap');
    expect(node.numericStyle('text-margin-y')).toBe(0);
  });

  it('GIVEN an exporting umbrella with a glyph family THEN the state glyph prefixes the two lines', () => {
    const glyphCy = umbrellaCyOf(true);
    const node = glyphCy.getElementById('web#build');

    node.addClass('exporting');

    expect(styleTextOf(glyphCy, 'web#build', 'label')).toBe(`${BLANK_GLYPH} lint\n10 files · 3 cached · 1 failed`);
    glyphCy.destroy();
  });

  it('GIVEN a plain task classed exporting THEN its label is unchanged', () => {
    const plain = cy.getElementById('api#build');

    plain.addClass('exporting');

    expect(styleTextOf(cy, 'api#build', 'label')).toBe('build');
  });
});
