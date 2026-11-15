import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CARD_MEASURES_STUB } from '../test/stubs/graph-card.stub.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const TASK_BOX_PLACEMENT = ['web', 'top', 22.5, 'left-inside', -32, 'ellipsis'];

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

const placementOf = (cy: Core, id: string): unknown[] => {
  const box = cy.getElementById(id);
  const placement: unknown[] = [
    box.style('label'),
    box.style('text-valign'),
    box.numericStyle('text-margin-y'),
    box.style('text-halign'),
    box.numericStyle('text-margin-x'),
    box.style('text-wrap')
  ];

  return placement;
};

describe('FEATURE: taskRulesOf task boxes in graphStyleOf', () => {
  let cy: Core;

  beforeEach(() => {
    const elements = [boxOf('pkg:web', 'web'), childOf('web#build', 'pkg:web')];

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false, CARD_MEASURES_STUB));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a task-box', () => {
    it('THEN its title sits in the top padding band, left-aligned a padding in, cut with an ellipsis', () => {
      expect(placementOf(cy, 'pkg:web')).toStrictEqual(TASK_BOX_PLACEMENT);
    });

    it('THEN its title is drawn in the label colour', () => {
      expect(cy.getElementById('pkg:web').style('color')).toBe('rgb(238,238,238)');
    });
  });

  describe('GIVEN a task-box while exporting', () => {
    it('THEN it keeps its one left-aligned title', () => {
      cy.getElementById('pkg:web').addClass('exporting');

      expect(placementOf(cy, 'pkg:web')).toStrictEqual(TASK_BOX_PLACEMENT);
    });
  });

  describe('GIVEN a task-box with dimmed-box', () => {
    it('THEN its title fades to 25% with its frame', () => {
      const box = cy.getElementById('pkg:web');

      box.addClass('dimmed-box');

      expect([box.numericStyle('text-opacity'), box.numericStyle('border-opacity')]).toStrictEqual([0.25, 0.25]);
    });
  });
});
