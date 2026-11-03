import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { boxesOf } from './graph-task-boxes.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { NEUTRAL_NAMING, ROOT_TASKS_TITLE } from '../common/graph-task.const.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';
import { folderIdOf } from '../utils/folder-id.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const TURBO = taskOf('app#build', []);

const SCRIPT = scriptOf('app#dev', []);

const BUILD_AT: Position = { x: 0, y: 0 };

const DEV_AT: Position = { x: 0, y: 100 };

const POSITIONS: Positions = { 'app#build': BUILD_AT, 'app#dev': DEV_AT };

const TITLE_WIDTHS = new Map([
  ['app', 31],
  ['scripts:app', 71]
]);

const drawingOf = (tasks: GraphTask[]): TaskDrawing => {
  const drawing: TaskDrawing = {
    tasks,
    positions: POSITIONS,
    sizeOf: (): NodeSize => NODE_SIZE,
    sizes: new Map(),
    labels: new Map(),
    titleWidths: TITLE_WIDTHS,
    rootLabel: null,
    naming: NEUTRAL_NAMING
  };

  return drawing;
};

const SCRIPTS_DATA = { id: 'scripts:app', parent: 'pkg:app', title: 'Scripts', minWidth: 71 };

const APPS_ID = folderIdOf('apps');

/** `app` sits in the folder `apps`. */
const GROUPED: TaskNaming = { ...NEUTRAL_NAMING, grouped: true, folders: new Map([['app', 'apps']]) };

const groupedDrawingOf = (tasks: GraphTask[]): TaskDrawing => {
  const drawing = drawingOf(tasks);
  const titleWidths = new Map([...TITLE_WIDTHS, [APPS_ID, 41]]);
  const grouped: TaskDrawing = { ...drawing, titleWidths, naming: GROUPED };

  return grouped;
};

const FOLDER_DATA = { id: APPS_ID, title: folderTitleOf('apps'), minWidth: 41 };

const NESTED_PACKAGE_DATA = { id: 'pkg:app', title: 'app', minWidth: 31, parent: APPS_ID };

const PACKAGE_DATA = { id: 'pkg:app', title: 'app', minWidth: 31 };

const idOf = (definition: ElementDefinition): string | undefined => definition.data.id;

describe('FEATURE: boxesOf', () => {
  describe('GIVEN app with the turbo task app#build and the script app#dev', () => {
    it('WHEN the boxes are listed THEN the package box comes before the Scripts box inside it', () => {
      const ids = boxesOf(drawingOf([TURBO, SCRIPT])).map(idOf);

      expect(ids).toStrictEqual(['pkg:app', 'scripts:app']);
    });

    it('WHEN the boxes are listed THEN the Scripts box sits in pkg:app, titled Scripts, as wide as its title width', () => {
      const [, scripts] = boxesOf(drawingOf([TURBO, SCRIPT]));

      expect(scripts).toStrictEqual({ data: SCRIPTS_DATA, classes: 'task-scripts' });
    });
  });

  describe('GIVEN app with only the turbo task app#build', () => {
    it('WHEN the boxes are listed THEN there is no Scripts box', () => {
      const ids = boxesOf(drawingOf([TURBO])).map(idOf);

      expect(ids).toStrictEqual(['pkg:app']);
    });
  });

  describe('GIVEN a Scripts box with no title width', () => {
    it('WHEN the boxes are listed THEN its minimum width is 0', () => {
      const untitled = drawingOf([SCRIPT]);
      const drawing: TaskDrawing = { ...untitled, titleWidths: new Map() };

      const [, scripts] = boxesOf(drawing);

      expect(scripts?.data['minWidth']).toBe(0);
    });
  });
});

describe('FEATURE: boxesOf grouped by folder', () => {
  describe('GIVEN grouped and app in apps', () => {
    it('WHEN the boxes are listed THEN the folder box comes first, then the package and Scripts boxes', () => {
      const ids = boxesOf(groupedDrawingOf([TURBO, SCRIPT])).map(idOf);

      expect(ids).toStrictEqual([APPS_ID, 'pkg:app', 'scripts:app']);
    });

    it('WHEN the boxes are listed THEN the folder box is a task-folder titled by its folder, as wide as its title width', () => {
      const [folder] = boxesOf(groupedDrawingOf([TURBO]));

      expect(folder).toStrictEqual({ data: FOLDER_DATA, classes: 'task-folder' });
    });

    it('WHEN the boxes are listed THEN the package box sits in the folder box', () => {
      const [, pkg] = boxesOf(groupedDrawingOf([TURBO]));

      expect(pkg).toStrictEqual({ data: NESTED_PACKAGE_DATA, classes: 'task-box' });
    });
  });

  describe('GIVEN ungrouped', () => {
    it('WHEN the boxes are listed THEN there is no folder box and the package box has no parent', () => {
      const boxes = boxesOf(drawingOf([TURBO]));

      expect(boxes).toStrictEqual([{ data: PACKAGE_DATA, classes: 'task-box' }]);
    });
  });
});

describe('FEATURE: createTaskCanvas nesting folders', () => {
  let cy: Core;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };

    cy = cytoscape({ headless: true, layout });
    createTaskCanvas(cy).show(groupedDrawingOf([TURBO, SCRIPT]));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN grouped and app in apps drawn THEN pkg:app sits in the apps folder box', () => {
    const parentId = cy.getElementById('pkg:app').parent().first().id();

    expect(parentId).toBe(APPS_ID);
  });
});

describe('FEATURE: createTaskCanvas nesting scripts', () => {
  let cy: Core;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };

    cy = cytoscape({ headless: true, layout });
    createTaskCanvas(cy).show(drawingOf([TURBO, SCRIPT]));
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN app#build and app#dev drawn THEN the script sits in scripts:app', () => {
    const parentId = cy.getElementById('app#dev').parent().first().id();

    expect(parentId).toBe('scripts:app');
  });

  it('GIVEN app#build and app#dev drawn THEN scripts:app sits in pkg:app', () => {
    const parentId = cy.getElementById('scripts:app').parent().first().id();

    expect(parentId).toBe('pkg:app');
  });

  it('GIVEN app#build and app#dev drawn THEN the turbo task sits in pkg:app', () => {
    const parentId = cy.getElementById('app#build').parent().first().id();

    expect(parentId).toBe('pkg:app');
  });
});

describe('FEATURE: boxesOf titles', () => {
  const titleOf = (drawing: TaskDrawing): unknown => boxesOf(drawing).find((box) => box.classes === 'task-box')?.data['title'];

  it('GIVEN a // task THEN the pkg:// box is titled with the root title', () => {
    expect(titleOf(drawingOf([taskOf('//#gen', [])]))).toBe(ROOT_TASKS_TITLE);
  });

  it('GIVEN a // task and the root label single-app THEN the box is titled single-app', () => {
    const base = drawingOf([taskOf('//#gen', [])]);
    const drawing: TaskDrawing = { ...base, rootLabel: 'single-app' };

    expect(titleOf(drawing)).toBe('single-app');
  });

  it('GIVEN an @org/x task labelled x THEN the box is titled x', () => {
    const naming: TaskNaming = { ...NEUTRAL_NAMING, labels: new Map([['@org/x', 'x']]) };

    const base = drawingOf([taskOf('@org/x#build', [])]);
    const drawing: TaskDrawing = { ...base, naming };

    expect(titleOf(drawing)).toBe('x');
  });
});
