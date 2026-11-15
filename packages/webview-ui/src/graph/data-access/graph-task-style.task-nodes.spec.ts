import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

describe('FEATURE: taskRulesOf task nodes in graphStyleOf', () => {
  let cy: Core;

  beforeEach(() => {
    const data = { id: 'web#build', label: 'build' };
    const task: ElementDefinition = { data, classes: 'task task-card' };

    cy = cytoscape({ headless: true, styleEnabled: true, elements: [task] });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a task card THEN its label is the task name over its state word, not its id', () => {
    expect(cy.getElementById('web#build').style('label')).toBe('build\nNot run');
  });

  it('GIVEN a task card THEN its label wraps at its newline', () => {
    expect(cy.getElementById('web#build').style('text-wrap')).toBe('wrap');
  });

  it('GIVEN a task with no run class THEN it has no outline', () => {
    expect(cy.getElementById('web#build').numericStyle('outline-width')).toBe(0);
  });
});
