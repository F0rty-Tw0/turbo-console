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

const DRAWING: TaskDrawing = { tasks: TASKS, positions: POSITIONS, sizeOf: (): NodeSize => NODE_SIZE };

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
