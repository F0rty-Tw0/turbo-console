import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import {
  SCRIPTS_BOX_CLASS,
  SCRIPTS_BOX_DASH_PX,
  TASK_BOX_CLASS,
  TASK_FOLDER_CLASS,
  TASK_NODE_CLASS
} from '../common/graph-task.const.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';

/** `web`'s package box around its Scripts box, which holds the 80 px script `web#dev` under a 200 px title. */
const PACKAGE_DATA = { id: 'pkg:web', title: 'web', minWidth: 30 };

const SCRIPTS_DATA = { id: 'scripts:web', parent: 'pkg:web', title: 'Scripts', minWidth: 200 };

const SCRIPT_DATA = { id: 'web#dev', parent: 'scripts:web', label: 'dev', width: 80, height: 32 };

const ORIGIN = { x: 0, y: 0 };

const ELEMENTS: ElementDefinition[] = [
  { data: PACKAGE_DATA, classes: TASK_BOX_CLASS },
  { data: SCRIPTS_DATA, classes: SCRIPTS_BOX_CLASS },
  { data: SCRIPT_DATA, classes: TASK_NODE_CLASS, position: ORIGIN }
];

const titlePlacementOf = (box: NodeSingular): unknown[] => {
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

describe('FEATURE: taskRulesOf Scripts boxes in graphStyleOf', () => {
  let cy: Core;
  let scripts: NodeSingular;

  beforeEach(() => {
    const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);

    cy = cytoscape({ headless: true, styleEnabled: true, style, elements: ELEMENTS });
    scripts = cy.getElementById('scripts:web');
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a task-scripts box THEN its frame is dashed', () => {
    const borderStyle: unknown = scripts.style('border-style');

    expect(borderStyle).toBe('dashed');
  });

  it('GIVEN a task-scripts box THEN its dashes are the Scripts pattern, apart from the package box dashes', () => {
    const dashes: unknown[] = [
      scripts.numericStyle('border-dash-pattern'),
      cy.getElementById('pkg:web').numericStyle('border-dash-pattern')
    ];

    expect(dashes).toStrictEqual([SCRIPTS_BOX_DASH_PX, [4, 4]]);
  });

  it('GIVEN a task-scripts box under a title wider than its script THEN it is as wide as its title', () => {
    const width = scripts.width();

    expect(width).toBe(200);
  });

  it('GIVEN a task-scripts box THEN its title is placed as a package box title, Scripts in place of the name', () => {
    const placement = titlePlacementOf(scripts);

    expect(placement).toStrictEqual(['Scripts', 'top', 22.5, 'left-inside', -32, 'ellipsis']);
  });
});

/** The folder box `apps` around `web`'s package box, which holds the 80 px task `web#build` under a 300 px folder title. */
const FOLDER_DATA = { id: 'folder-apps', title: 'apps', minWidth: 300 };

const FOLDED_PACKAGE_DATA = { id: 'pkg:web', parent: 'folder-apps', title: 'web', minWidth: 30 };

const TASK_DATA = { id: 'web#build', parent: 'pkg:web', label: 'build', width: 80, height: 32 };

const FOLDER_ELEMENTS: ElementDefinition[] = [
  { data: FOLDER_DATA, classes: TASK_FOLDER_CLASS },
  { data: FOLDED_PACKAGE_DATA, classes: TASK_BOX_CLASS },
  { data: TASK_DATA, classes: TASK_NODE_CLASS, position: ORIGIN }
];

describe('FEATURE: taskRulesOf folder boxes in graphStyleOf', () => {
  let cy: Core;
  let folder: NodeSingular;

  beforeEach(() => {
    const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);

    cy = cytoscape({ headless: true, styleEnabled: true, style, elements: FOLDER_ELEMENTS });
    folder = cy.getElementById('folder-apps');
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a task-folder box THEN its frame is solid, as a package-mode folder box', () => {
    const borderStyle: unknown = folder.style('border-style');

    expect(borderStyle).toBe('solid');
  });

  it('GIVEN a task-folder box THEN its corners are the 8 px of a folder box', () => {
    const radius: unknown = folder.numericStyle('corner-radius');

    expect(radius).toBe(8);
  });

  it('GIVEN a task-folder box under a title wider than its package THEN it is as wide as its title', () => {
    const width = folder.width();

    expect(width).toBe(300);
  });

  it('GIVEN a task-folder box THEN its title is drawn on the canvas, placed as a package box title', () => {
    const placement = titlePlacementOf(folder);

    expect(placement).toStrictEqual(['apps', 'top', 22.5, 'left-inside', -32, 'ellipsis']);
  });
});
