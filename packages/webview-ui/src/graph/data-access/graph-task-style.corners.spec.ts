import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const CORNER_RADII: [string, number][] = [
  ['atom-file', 10],
  ['atom-more', 10],
  ['task', 6],
  ['task atom-umbrella', 6]
];

const cornerElementOf = (classes: string): ElementDefinition => {
  const data = { id: classes };
  const definition: ElementDefinition = { data, classes };

  return definition;
};

describe('FEATURE: taskRulesOf corners in graphStyleOf', () => {
  let cy: Core;

  beforeEach(() => {
    const elements = CORNER_RADII.map(([classes]): ElementDefinition => cornerElementOf(classes));

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  it.each(CORNER_RADII)('GIVEN a node classed "%s" THEN its corners are %d px round', (classes, radius) => {
    expect(cy.getElementById(classes).numericStyle('corner-radius')).toBe(radius);
  });
});
