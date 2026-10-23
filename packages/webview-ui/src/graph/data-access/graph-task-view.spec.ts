import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

const idOf = (node: NodeSingular): string => node.id();

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
});
