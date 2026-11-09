import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { PACKAGE_GLYPH } from '../common/graph-glyph.const.ts';
import { SCRIPTS_BOX_CLASS, SCRIPTS_BOX_TITLE, TASK_BOX_CLASS, TASK_FOLDER_CLASS } from '../common/graph-task.const.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { folderIdOf } from '../utils/folder-id.util.ts';
import { scriptsBoxIdOf } from '../utils/task-compound.util.ts';

const boxOf = (id: string, title: string, className: string, parent?: string): ElementDefinition => {
  const bare = { id, title };
  const nested = { id, title, parent };
  const data = parent === undefined ? bare : nested;
  const definition: ElementDefinition = { data, classes: className };

  return definition;
};

const childOf = (id: string, parent: string): ElementDefinition => {
  const data = { id, parent };
  const definition: ElementDefinition = { data };

  return definition;
};

const styledCyOf = (glyphs: boolean): Core => {
  const elements = [
    boxOf(folderIdOf('apps'), 'apps', TASK_FOLDER_CLASS),
    boxOf('pkg:web', 'web', TASK_BOX_CLASS, folderIdOf('apps')),
    childOf('web#build', 'pkg:web'),
    boxOf(scriptsBoxIdOf('web'), SCRIPTS_BOX_TITLE, SCRIPTS_BOX_CLASS, 'pkg:web'),
    childOf('web#script', scriptsBoxIdOf('web'))
  ];
  const cy = cytoscape({ headless: true, styleEnabled: true, elements });

  cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', glyphs));

  return cy;
};

describe('FEATURE: package glyph on task box titles', () => {
  let cy: Core;

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the page draws glyphs', () => {
    beforeEach(() => {
      cy = styledCyOf(true);
    });

    it('WHEN a package box is styled THEN its label is the package glyph, a space and its title, in the codicon font list', () => {
      const box = cy.getElementById('pkg:web');

      expect(box.style('label')).toBe(`${PACKAGE_GLYPH} web`);
      expect(box.style('font-family')).toContain('codicon');
    });

    it.each([
      [scriptsBoxIdOf('web'), SCRIPTS_BOX_TITLE],
      [folderIdOf('apps'), 'apps']
    ])('WHEN box %s is styled THEN its label stays %s', (id, title) => {
      expect(cy.getElementById(id).style('label')).toBe(title);
    });
  });

  describe('GIVEN the page draws no glyphs', () => {
    beforeEach(() => {
      cy = styledCyOf(false);
    });

    it('WHEN a package box is styled THEN its label is its plain title', () => {
      expect(cy.getElementById('pkg:web').style('label')).toBe('web');
    });
  });
});
