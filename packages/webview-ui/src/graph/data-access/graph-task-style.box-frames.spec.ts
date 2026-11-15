import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const boxOf = (id: string, title: string): ElementDefinition => {
  const data = { id, title };
  const definition: ElementDefinition = { data, classes: 'task-box' };

  return definition;
};

const childOf = (id: string, parent: string): ElementDefinition => {
  const data = { id, parent };
  const definition: ElementDefinition = { data };

  return definition;
};

describe('FEATURE: taskRulesOf box frames in graphStyleOf', () => {
  let cy: Core;

  beforeEach(() => {
    const atomBoxData = { id: 'atom:web#e2e-ci', parent: 'pkg:web' };
    const atomBox: ElementDefinition = { data: atomBoxData, classes: 'atom-box' };
    const elements = [boxOf('pkg:web', 'web'), atomBox, childOf('web#e2e-ci--a.ts', 'atom:web#e2e-ci')];

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a task-box THEN its frame is dashed', () => {
    const box = cy.getElementById('pkg:web');

    const borderStyle: unknown = box.style('border-style');

    expect(borderStyle).toBe('dashed');
  });

  it('GIVEN a task-box THEN its dashes are 4 px on, 4 px off', () => {
    const box = cy.getElementById('pkg:web');

    const dashPattern: unknown = box.numericStyle('border-dash-pattern');

    expect(dashPattern).toStrictEqual([4, 4]);
  });

  it('GIVEN an atom-box THEN its frame stays solid', () => {
    const box = cy.getElementById('atom:web#e2e-ci');

    const borderStyle: unknown = box.style('border-style');

    expect(borderStyle).toBe('solid');
  });
});
