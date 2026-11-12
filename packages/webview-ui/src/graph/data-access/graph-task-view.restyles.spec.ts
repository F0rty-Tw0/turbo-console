import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';
import { restyledIdsDuring, styleEventsDuring } from '../test/utils/style-events.spec.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

/** `web#build` depends on `api#build`; `ui#lint` stands alone. */
const TASKS: GraphTask[] = [taskOf('api#build', []), taskOf('web#build', ['api#build']), taskOf('ui#lint', [])];

const DRAWING: TaskDrawing = {
  tasks: TASKS,
  positions: {},
  boxFrames: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map(),
  labels: new Map(),
  titleWidths: new Map(),
  rootLabel: null,
  naming: NAMING_STUB
};

describe('FEATURE: createTaskCanvas restyles with styles on', () => {
  let cy: Core;
  let canvas: TaskCanvas;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };

    cy = cytoscape({ headless: true, styleEnabled: true, layout });
    canvas = createTaskCanvas(cy);
    canvas.show(DRAWING);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN three tasks are shown and web#build is running', () => {
    beforeEach(() => {
      canvas.runStates({ 'web#build': 'running' });
    });

    it('WHEN the same map comes again THEN no element is restyled', () => {
      const restyles = styleEventsDuring(cy, (): void => canvas.runStates({ 'web#build': 'running' }));

      expect(restyles).toBe(0);
    });

    it('WHEN only web#build changes state THEN only web#build and its package compound are restyled', () => {
      const restyled = restyledIdsDuring(cy, (): void => canvas.runStates({ 'web#build': 'passed' }));

      expect(restyled).toStrictEqual(['pkg:web', 'web#build']);
    });
  });

  describe('GIVEN three tasks are shown and web#build is painted as the target', () => {
    beforeEach(() => {
      canvas.paint('web#build');
    });

    it('WHEN web#build is painted again THEN no element is restyled', () => {
      const restyles = styleEventsDuring(cy, (): void => canvas.paint('web#build'));

      expect(restyles).toBe(0);
    });

    it('WHEN api#build becomes the target THEN only api#build, web#build and their package compounds are restyled', () => {
      const restyled = restyledIdsDuring(cy, (): void => canvas.paint('api#build'));

      expect(restyled).toStrictEqual(['api#build', 'pkg:api', 'pkg:web', 'web#build']);
    });
  });

  describe('GIVEN three tasks are shown and nothing is painted as the target', () => {
    it('WHEN no target is painted again THEN no element is restyled', () => {
      const restyles = styleEventsDuring(cy, (): void => canvas.paint(null));

      expect(restyles).toBe(0);
    });
  });
});
