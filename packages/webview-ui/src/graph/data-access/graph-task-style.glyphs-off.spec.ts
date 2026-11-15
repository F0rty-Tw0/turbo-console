import cytoscape from 'cytoscape';
import type { ElementDefinition } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const glyphElementOf = (id: string, label: string, classes: string): ElementDefinition => {
  const data = { id, label, width: 80, height: 22 };
  const definition: ElementDefinition = { data, classes };

  return definition;
};

describe('FEATURE: taskRulesOf labels in graphStyleOf with glyphs off', () => {
  it('GIVEN a running task and a file THEN their labels are their data labels in the body font', () => {
    const elements = [glyphElementOf('web#build', 'build', 'task run-running'), glyphElementOf('web#a', 'a.ts', 'atom-file')];
    const cy = cytoscape({ headless: true, styleEnabled: true, elements });

    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));

    expect(cy.getElementById('web#build').style('label')).toBe('build');
    expect(cy.getElementById('web#a').style('label')).toBe('a.ts');
    expect(cy.getElementById('web#build').style('font-family')).toBe('sans-serif');

    cy.destroy();
  });
});
