import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { probeStateOf } from './graph-probe-state.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 10, y: 120 };

const MOVED_AT: Position = { x: 300, y: 400 };

const ORIGIN: Position = { x: 0, y: 0 };

const TASKS: GraphTask[] = [taskOf('api#build', []), taskOf('web#build', ['api#build'])];

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT };

const NO_SIZES = new Map<string, NodeSize>();

const NO_LABELS = new Map<string, string>();

const DRAWING: TaskDrawing = {
  tasks: TASKS,
  positions: POSITIONS,
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: NO_SIZES,
  labels: NO_LABELS,
  titleWidths: new Map(),
  rootLabel: null
};

const WEB_TITLE_WIDTHS = new Map([['web', 130]]);

/** `DRAWING` with a title width for `web` only. */
const TITLED_DRAWING: TaskDrawing = { ...DRAWING, titleWidths: WEB_TITLE_WIDTHS };

const UMBRELLA_SIZE: NodeSize = { width: 200, height: 48 };

/** `web#build` drawn as an umbrella of its own size with a counts line. */
const UMBRELLA_DRAWING: TaskDrawing = {
  ...DRAWING,
  sizes: new Map([['web#build', UMBRELLA_SIZE]]),
  labels: new Map([['web#build', '10 files']])
};

const PAINT_TASKS: GraphTask[] = [...TASKS, taskOf('ui#lint', [])];

const PAINT_DRAWING: TaskDrawing = { ...DRAWING, tasks: PAINT_TASKS };

const STATE_SELECTOR = '.selected, .highlighted, .dimmed, .dimmed-box';

const WEB_LINK = edgeIdOf({ source: 'web#build', target: 'api#build' });

const idOf = (node: NodeSingular): string => node.id();

const isRunClass = (name: string): boolean => name.startsWith('run-');

const runClassesOf = (cy: Core, id: string): string[] => {
  const classes = cy.getElementById(id).classes();

  return classes.filter(isRunClass);
};

const stateOf = (cy: Core, id: string): string => {
  const element = cy.getElementById(id);

  return probeStateOf(element);
};

const nodeIdsOf = (cy: Core): string[] => {
  const ids = cy.nodes().map(idOf);

  return ids.sort();
};

describe('FEATURE: createTaskCanvas', () => {
  let cy: Core;
  let canvas: TaskCanvas;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };
    const elements = [canvasNodeOf('web'), canvasNodeOf('ui')];

    cy = cytoscape({ headless: true, layout, elements });
    canvas = createTaskCanvas(cy);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a package graph is drawn', () => {
    it('WHEN two tasks are shown THEN only the tasks and their package compounds are left', () => {
      canvas.show(DRAWING);

      expect(nodeIdsOf(cy)).toStrictEqual(['api#build', 'pkg:api', 'pkg:web', 'web#build']);
    });

    it('WHEN shown THEN each compound carries its package name as title', () => {
      canvas.show(DRAWING);

      expect(cy.getElementById('pkg:web').data('title')).toBe('web');
    });

    it('WHEN shown with a title width for web THEN its compound carries it as data(minWidth)', () => {
      canvas.show(TITLED_DRAWING);

      expect(cy.getElementById('pkg:web').data('minWidth')).toBe(130);
    });

    it('WHEN shown with no title width for api THEN its compound carries 0 as data(minWidth)', () => {
      canvas.show(TITLED_DRAWING);

      expect(cy.getElementById('pkg:api').data('minWidth')).toBe(0);
    });

    it('WHEN shown THEN each compound is classed task-box, so its title is drawn on the page', () => {
      canvas.show(DRAWING);

      expect(cy.nodes('.task-box').map(idOf)).toStrictEqual(['pkg:api', 'pkg:web']);
    });

    it('WHEN a root task is shown THEN its pkg:// compound is titled //, as the package graph labels the root package', () => {
      const tasks = [taskOf('//#build', [])];
      const rootDrawing: TaskDrawing = { ...DRAWING, tasks };

      canvas.show(rootDrawing);

      expect(cy.getElementById('pkg://').data('title')).toBe('//');
    });

    it('WHEN a root task is shown with the label single-app THEN the compound is titled single-app and keeps its pkg:// id', () => {
      const tasks = [taskOf('//#build', [])];
      const rootDrawing: TaskDrawing = { ...DRAWING, tasks, rootLabel: 'single-app' };

      canvas.show(rootDrawing);

      const parentIds = cy.getElementById('//#build').parent().map(idOf);

      expect(cy.getElementById('pkg://').data('title')).toBe('single-app');
      expect(parentIds).toStrictEqual(['pkg://']);
    });

    it('WHEN shown THEN each task sits in its package compound, classed task and labelled by its name', () => {
      canvas.show(DRAWING);

      const web = cy.getElementById('web#build');
      const parentIds = web.parent().map((parent) => parent.id());

      expect(parentIds).toStrictEqual(['pkg:web']);
      expect(web.hasClass('task')).toBe(true);
      expect(web.data('label')).toBe('build');
    });

    it('WHEN shown THEN the edge runs from the task to its dependency with the page edge id', () => {
      canvas.show(DRAWING);

      const edgeId = edgeIdOf({ source: 'web#build', target: 'api#build' });
      const edge = cy.getElementById(edgeId);

      expect(edge.source().id()).toBe('web#build');
      expect(edge.target().id()).toBe('api#build');
    });
  });

  describe('GIVEN an umbrella is drawn', () => {
    beforeEach(() => {
      canvas.show(UMBRELLA_DRAWING);
    });

    it('WHEN shown THEN it is classed atom-umbrella besides task', () => {
      const web = cy.getElementById('web#build');

      expect(web.hasClass('task')).toBe(true);
      expect(web.hasClass('atom-umbrella')).toBe(true);
    });

    it('WHEN shown THEN a plain task is not classed atom-umbrella', () => {
      expect(cy.getElementById('api#build').hasClass('atom-umbrella')).toBe(false);
    });

    it('WHEN shown THEN it has the size of its own', () => {
      expect(cy.getElementById('web#build').data()).toMatchObject(UMBRELLA_SIZE);
    });

    it('WHEN shown THEN a plain task has the sizer’s size', () => {
      expect(cy.getElementById('api#build').data()).toMatchObject(NODE_SIZE);
    });

    it('WHEN shown THEN its label is the name over its counts line', () => {
      expect(cy.getElementById('web#build').data('label')).toBe('build\n10 files');
    });

    it('WHEN setCounts names it THEN its label is the name over the new counts', () => {
      canvas.setCounts(new Map([['web#build', '10 files · 3 cached']]));

      expect(cy.getElementById('web#build').data('label')).toBe('build\n10 files · 3 cached');
    });

    it('WHEN setCounts names it THEN no node moves', () => {
      canvas.setCounts(new Map([['web#build', '10 files · 3 cached']]));

      expect(canvas.positions()).toStrictEqual(POSITIONS);
    });

    it('WHEN setCounts names a task that is not drawn THEN nothing throws', () => {
      const setGone = (): void => canvas.setCounts(new Map([['gone#build', '1 files']]));

      expect(setGone).not.toThrow();
    });
  });

  describe('GIVEN two tasks are shown', () => {
    beforeEach(() => {
      canvas.show(DRAWING);
    });

    it('WHEN positions are read THEN only the tasks are listed', () => {
      expect(canvas.positions()).toStrictEqual(POSITIONS);
    });

    it('WHEN positions are set, a compound among them THEN the tasks move and the compound id is skipped', () => {
      const moved: Positions = { 'pkg:web': API_AT, 'web#build': MOVED_AT };

      canvas.setPositions(moved);

      const expected: Positions = { 'api#build': ORIGIN, 'web#build': MOVED_AT };

      expect(canvas.positions()).toStrictEqual(expected);
    });

    it('WHEN cleared THEN nothing is left', () => {
      canvas.clear();

      expect(cy.elements()).toHaveLength(0);
    });
  });

  describe('GIVEN three tasks are shown for runs and paint', () => {
    beforeEach(() => {
      canvas.show(PAINT_DRAWING);
    });

    it('GIVEN web#build failed WHEN runStates is called THEN only it carries run-failed', () => {
      canvas.runStates({ 'web#build': 'failed' });

      expect(runClassesOf(cy, 'web#build')).toStrictEqual(['run-failed']);
      expect(runClassesOf(cy, 'api#build')).toStrictEqual([]);
    });

    it('WHEN a later map omits web#build THEN its run class goes and the new one is set', () => {
      canvas.runStates({ 'web#build': 'failed' });
      canvas.runStates({ 'api#build': 'running' });

      expect(runClassesOf(cy, 'web#build')).toStrictEqual([]);
      expect(runClassesOf(cy, 'api#build')).toStrictEqual(['run-running']);
    });

    it('WHEN a map names a task that is not drawn THEN the drawn tasks carry no run class', () => {
      canvas.runStates({ 'gone#build': 'passed' });

      expect(cy.elements('.run-passed')).toHaveLength(0);
    });

    it('WHEN web#build is painted THEN it is selected, api#build highlighted, ui#lint dimmed and only pkg:ui dimmed-box', () => {
      canvas.paint('web#build');

      expect(stateOf(cy, 'web#build')).toBe('selected');
      expect(stateOf(cy, 'api#build')).toBe('highlighted');
      expect(stateOf(cy, WEB_LINK)).toBe('highlighted');
      expect(stateOf(cy, 'ui#lint')).toBe('dimmed');
      expect(cy.getElementById('pkg:ui').hasClass('dimmed-box')).toBe(true);
      expect(cy.getElementById('pkg:web').hasClass('dimmed-box')).toBe(false);
      expect(cy.getElementById('pkg:api').hasClass('dimmed-box')).toBe(false);
    });

    it('WHEN the paint is cleared THEN no element carries a state class', () => {
      canvas.paint('web#build');
      canvas.paint(null);

      expect(cy.elements(STATE_SELECTOR)).toHaveLength(0);
    });

    it('WHEN the tasks are shown again THEN the last paint and runs are kept', () => {
      canvas.paint('web#build');
      canvas.runStates({ 'api#build': 'passed' });
      canvas.show(PAINT_DRAWING);

      expect(stateOf(cy, 'web#build')).toBe('selected');
      expect(runClassesOf(cy, 'api#build')).toStrictEqual(['run-passed']);
    });
  });
});
