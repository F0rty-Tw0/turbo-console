import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { ATOM_BOX_CLASS } from '../common/graph-atom.const.ts';
import { SCRIPTS_BOX_CLASS, TASK_BOX_CLASS, TASK_FOLDER_CLASS } from '../common/graph-task.const.ts';
import { DIMMED_BOX_CLASS } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

const ORIGIN = { x: 0, y: 0 };

const FOLDER_DATA = { id: 'folder:apps', title: 'apps' };

const PACKAGE_DATA = { id: 'pkg:web', parent: 'folder:apps', title: 'web' };

const SCRIPTS_DATA = { id: 'scripts:web', parent: 'pkg:web', title: 'Scripts' };

const ATOM_DATA = { id: 'atom-box:web#e2e', parent: 'pkg:web' };

const SCRIPT_DATA = { id: 'web#dev', parent: 'scripts:web', width: 80, height: 32 };

const UMBRELLA_DATA = { id: 'web#e2e', parent: 'atom-box:web#e2e', width: 80, height: 32 };

const PLAIN_BOX_DATA = { id: 'apps', title: 'apps' };

const PLAIN_CHILD_DATA = { id: 'web', parent: 'apps', width: 80, height: 32 };

/** A task folder around a package box holding a Scripts box and an Atomizer box; beside it a package mode folder box. */
const ELEMENTS: ElementDefinition[] = [
  { data: FOLDER_DATA, classes: TASK_FOLDER_CLASS },
  { data: PACKAGE_DATA, classes: TASK_BOX_CLASS },
  { data: SCRIPTS_DATA, classes: SCRIPTS_BOX_CLASS },
  { data: ATOM_DATA, classes: ATOM_BOX_CLASS },
  { data: SCRIPT_DATA, position: ORIGIN },
  { data: UMBRELLA_DATA, position: ORIGIN },
  { data: PLAIN_BOX_DATA },
  { data: PLAIN_CHILD_DATA, position: ORIGIN }
];

const TASK_BOX_IDS = ['folder:apps', 'pkg:web', 'scripts:web', 'atom-box:web#e2e'];

const LIGHT_COLORS: ThemeColors = { ...CANVAS_COLORS, background: '#fff' };

const HIGH_CONTRAST_COLORS: ThemeColors = { ...CANVAS_COLORS, background: '#000' };

const cyOf = (colors: ThemeColors): Core => {
  const style = graphStyleOf(colors, 'sans-serif', false);

  return cytoscape({ headless: true, styleEnabled: true, elements: ELEMENTS, style });
};

/** The title's backdrop colour and opacity. */
const backdropOf = (cy: Core, id: string): unknown[] => {
  const box = cy.getElementById(id);
  const backdrop: unknown[] = [box.style('text-background-color'), box.numericStyle('text-background-opacity')];

  return backdrop;
};

const fillOpacitiesOf = (cy: Core, ids: string[]): unknown[] =>
  ids.map((id): unknown => cy.getElementById(id).numericStyle('background-opacity'));

describe('FEATURE: task box titles drawn on an opaque backdrop over see-through boxes', () => {
  let cy: Core;

  afterEach(() => {
    cy.destroy();
  });

  describe.each([
    { theme: 'dark', colors: CANVAS_COLORS, rgb: 'rgb(17,17,17)' },
    { theme: 'light', colors: LIGHT_COLORS, rgb: 'rgb(255,255,255)' },
    { theme: 'high contrast', colors: HIGH_CONTRAST_COLORS, rgb: 'rgb(0,0,0)' }
  ])('GIVEN the $theme theme colours', ({ colors, rgb }) => {
    it('WHEN a package box is styled THEN its title is drawn on an opaque backdrop of the theme background', () => {
      cy = cyOf(colors);

      expect(backdropOf(cy, 'pkg:web')).toStrictEqual([rgb, 1]);
    });
  });

  describe('GIVEN the task folder, package, Scripts and Atomizer boxes', () => {
    it('WHEN styled THEN each fill is see-through', () => {
      cy = cyOf(CANVAS_COLORS);

      expect(fillOpacitiesOf(cy, TASK_BOX_IDS)).toStrictEqual([0, 0, 0, 0]);
    });

    it('WHEN faded with dimmed-box THEN each fill stays see-through', () => {
      cy = cyOf(CANVAS_COLORS);
      cy.nodes().addClass(DIMMED_BOX_CLASS);

      expect(fillOpacitiesOf(cy, TASK_BOX_IDS)).toStrictEqual([0, 0, 0, 0]);
    });
  });

  describe('GIVEN a package mode folder box', () => {
    it('WHEN styled THEN its fill stays opaque', () => {
      cy = cyOf(CANVAS_COLORS);

      expect(fillOpacitiesOf(cy, ['apps'])).toStrictEqual([1]);
    });

    it('WHEN faded with dimmed-box THEN its fill takes the dimmed opacity', () => {
      cy = cyOf(CANVAS_COLORS);
      cy.getElementById('apps').addClass(DIMMED_BOX_CLASS);

      expect(fillOpacitiesOf(cy, ['apps'])).toStrictEqual([CANVAS_COLORS.dimmedOpacity]);
    });
  });
});
