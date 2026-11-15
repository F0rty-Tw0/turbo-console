import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const FOLDER_BOX_DATA = { id: 'folder:apps', title: 'apps' };

const FOLDER_BOX: ElementDefinition = { data: FOLDER_BOX_DATA };

const FOLDER_CHILD_DATA = { id: 'site', parent: 'folder:apps' };

const FOLDER_CHILD: ElementDefinition = { data: FOLDER_CHILD_DATA };

describe('FEATURE: graphStyleOf folder boxes', () => {
  let cy: Core;

  beforeEach(() => {
    const elements = [FOLDER_BOX, FOLDER_CHILD];

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a folder box', () => {
    it('THEN it shows no label on the page', () => {
      expect(cy.getElementById('folder:apps').style('label')).toBe('');
    });
  });

  describe('GIVEN a folder box while exporting', () => {
    it('THEN its title is centred in the top padding band', () => {
      const box = cy.getElementById('folder:apps');

      box.addClass('exporting');

      const placement = [
        box.style('label'),
        box.style('text-halign'),
        box.numericStyle('text-margin-x'),
        box.numericStyle('text-margin-y')
      ];

      expect(placement).toStrictEqual(['apps', 'center', 0, 22.5]);
    });
  });
});
