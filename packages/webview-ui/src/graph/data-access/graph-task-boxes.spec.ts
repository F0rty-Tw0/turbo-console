import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { boxesOf } from './graph-task-boxes.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { NEUTRAL_NAMING } from '../common/graph-task.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

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
