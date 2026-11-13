import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { taskClassesOf } from './graph-atom-view.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const TASKS: GraphTask[] = [taskOf('api#build', []), taskOf('web#build', ['api#build'])];

const DRAWING: TaskDrawing = {
  tasks: TASKS,
  positions: {},
  boxFrames: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map([['web#build', NODE_SIZE]]),
  counts: new Map(),
  titleWidths: new Map(),
  rootLabel: null,
  naming: NAMING_STUB
};

describe('FEATURE: the task-card class', () => {
  describe('GIVEN taskClassesOf', () => {
    it('WHEN the task is plain THEN the classes are task and task-card', () => {
      expect(taskClassesOf(false)).toBe('task task-card');
    });

    it('WHEN the task is an umbrella THEN the classes are task and atom-umbrella', () => {
      expect(taskClassesOf(true)).toBe('task atom-umbrella');
    });
  });

  describe('GIVEN api#build plain and web#build an umbrella drawn on a headless canvas', () => {
    let cy: Core;

    beforeEach(() => {
      const layout = { name: 'preset', fit: false };

      cy = cytoscape({ headless: true, layout });
      createTaskCanvas(cy).show(DRAWING);
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN the nodes are read THEN the plain task has the task-card class', () => {
      expect(cy.getElementById('api#build').hasClass('task-card')).toBe(true);
    });

    it('WHEN the nodes are read THEN the umbrella has not', () => {
      expect(cy.getElementById('web#build').hasClass('task-card')).toBe(false);
    });
  });
});
