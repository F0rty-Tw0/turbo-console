import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS, CANVAS_ELEMENTS } from '../test/utils/canvas-elements.spec.util.ts';
import { pressOf } from '../test/utils/press.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const NO_STYLE = {};

const AB = edgeIdOf({ source: 'a', target: 'b' });

/** The style of the stylesheet's `core` rule; empty when there is none. */
const coreStyleOf = (): object => {
  const rule = graphStyleOf(CANVAS_COLORS, 'sans-serif', false).find((each) => each.selector === 'core');

  if (rule === undefined || !('style' in rule)) return NO_STYLE;

  return rule.style;
};

describe('FEATURE: graphStyleOf press feedback', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, elements: CANVAS_ELEMENTS });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a pressed node THEN its overlay is clear', () => {
    const node = cy.getElementById('a');

    pressOf(node);

    expect(node.numericStyle('overlay-opacity')).toBe(0);
  });

  it('GIVEN a pressed edge THEN its overlay is clear', () => {
    const edge = cy.getElementById(AB);

    pressOf(edge);

    expect(edge.numericStyle('overlay-opacity')).toBe(0);
  });

  it('GIVEN the stylesheet THEN the core draws no press circle on the background', () => {
    const style = coreStyleOf();

    expect(Object.fromEntries(Object.entries(style))['active-bg-opacity']).toBe(0);
  });

  it('GIVEN a selected edge THEN it is still 2 wide', () => {
    const edge = cy.getElementById(AB);

    edge.addClass('selected');

    expect(edge.numericStyle('width')).toBe(2);
  });
});
