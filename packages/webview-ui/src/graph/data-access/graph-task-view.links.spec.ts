import cytoscape from 'cytoscape';
import type { Core, EdgeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const PRESET = { name: 'preset', fit: false };

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 90, y: 160 };

const MOVED_AT: Position = { x: 300, y: 400 };

const TASKS: GraphTask[] = [taskOf('api#build', []), taskOf('web#build', ['api#build'])];

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT };

const DRAWING: TaskDrawing = {
  tasks: TASKS,
  positions: POSITIONS,
  boxFrames: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map(),
  labels: new Map(),
  titleWidths: new Map(),
  rootLabel: null,
  naming: NAMING_STUB
};

const WEB_LINK = edgeIdOf({ source: 'web#build', target: 'api#build' });

/** What a link carries that would draw it on a route: the routed class and the segment data. */
const routeDataOf = (link: EdgeSingular): unknown[] => [link.hasClass(ROUTED_CLASS), link.data('segWeights'), link.data('srcEnd')];

describe('FEATURE: createTaskCanvas links in the graph stylesheet', () => {
  let cy: Core;
  let canvas: TaskCanvas;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true, layout: PRESET });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
    canvas = createTaskCanvas(cy);
    canvas.show(DRAWING);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN two tasks shown with a link between them', () => {
    it('WHEN styled THEN the link is drawn curve-style straight', () => {
      const curve: unknown = cy.getElementById(WEB_LINK).style('curve-style');

      expect(curve).toBe('straight');
    });

    it('WHEN shown THEN the link carries no route class and no segment data', () => {
      expect(routeDataOf(cy.getElementById(WEB_LINK))).toStrictEqual([false, undefined, undefined]);
    });

    it('WHEN a task is moved THEN the link stays straight', () => {
      canvas.setPositions({ 'web#build': MOVED_AT });

      const curve: unknown = cy.getElementById(WEB_LINK).style('curve-style');

      expect(curve).toBe('straight');
    });
  });
});
