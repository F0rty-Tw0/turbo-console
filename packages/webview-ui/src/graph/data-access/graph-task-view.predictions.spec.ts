import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { taskRulesOf } from './graph-task-style.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphPrediction } from '../../bridge/common/graph-message.type.ts';
import type { GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const HISTORY = String.fromCodePoint(0xea82);

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const TASKS: GraphTask[] = [taskOf('api#build', []), taskOf('web#build', ['api#build']), taskOf('ui#lint', [])];

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 10, y: 120 };

const UI_AT: Position = { x: 200, y: 20 };

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT, 'ui#lint': UI_AT };

const DRAWING: TaskDrawing = {
  tasks: TASKS,
  positions: POSITIONS,
  routes: {},
  boxFrames: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map(),
  labels: new Map(),
  titleWidths: new Map(),
  rootLabel: null,
  naming: NAMING_STUB
};

const isPredictionClass = (name: string): boolean => name.startsWith('predict-');

const isRunClass = (name: string): boolean => name.startsWith('run-');

const predictionClassesOf = (cy: Core, id: string): string[] => {
  const classes = cy.getElementById(id).classes();

  return classes.filter(isPredictionClass);
};

const runClassesOf = (cy: Core, id: string): string[] => {
  const classes = cy.getElementById(id).classes();

  return classes.filter(isRunClass);
};

describe('FEATURE: task canvas predictions', () => {
  let cy: Core;
  let canvas: TaskCanvas;

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN three drawn tasks', () => {
    beforeEach(() => {
      const layout = { name: 'preset', fit: false };

      cy = cytoscape({ headless: true, layout });
      canvas = createTaskCanvas(cy);
      canvas.show(DRAWING);
    });

    it('WHEN predictions names two tasks THEN each carries its class', () => {
      canvas.predictions({ 'api#build': 'cached', 'web#build': 'unknown' });

      expect(predictionClassesOf(cy, 'api#build')).toStrictEqual(['predict-cached']);
      expect(predictionClassesOf(cy, 'web#build')).toStrictEqual(['predict-unknown']);
    });

    it('WHEN predictions names two tasks THEN the third carries none', () => {
      canvas.predictions({ 'api#build': 'cached', 'web#build': 'unknown' });

      expect(predictionClassesOf(cy, 'ui#lint')).toStrictEqual([]);
    });

    it('WHEN a later record changes a word THEN the old class goes and the new one is set', () => {
      canvas.predictions({ 'api#build': 'cached', 'web#build': 'unknown' });
      canvas.predictions({ 'api#build': 'notCached' });

      expect(predictionClassesOf(cy, 'api#build')).toStrictEqual(['predict-notCached']);
    });

    it('WHEN a later record omits a task THEN its class goes', () => {
      canvas.predictions({ 'api#build': 'cached', 'web#build': 'unknown' });
      canvas.predictions({ 'api#build': 'notCached' });

      expect(predictionClassesOf(cy, 'web#build')).toStrictEqual([]);
    });

    it('WHEN the record names a task that is not drawn THEN no element carries a predict class', () => {
      canvas.predictions({ 'gone#build': 'cached' });

      expect(cy.elements('.predict-cached')).toHaveLength(0);
    });

    it('WHEN the record is empty THEN every predict class is cleared', () => {
      canvas.predictions({ 'api#build': 'cached', 'web#build': 'unknown', 'ui#lint': 'notCached' });
      canvas.predictions({});

      expect(cy.elements('.predict-cached, .predict-unknown, .predict-notCached')).toHaveLength(0);
    });

    it('WHEN the tasks are shown again THEN the kept predictions are marked again', () => {
      canvas.predictions({ 'api#build': 'cached' });
      canvas.show(DRAWING);

      expect(predictionClassesOf(cy, 'api#build')).toStrictEqual(['predict-cached']);
    });

    it('WHEN remark runs after a class was dropped THEN the kept predictions are marked again', () => {
      canvas.predictions({ 'api#build': 'cached' });
      cy.getElementById('api#build').removeClass('predict-cached');
      canvas.remark();

      expect(predictionClassesOf(cy, 'api#build')).toStrictEqual(['predict-cached']);
    });

    it('WHEN a run state and a prediction are both set THEN both classes are kept on the node', () => {
      canvas.runStates({ 'web#build': 'passed' });
      canvas.predictions({ 'web#build': 'cached' });

      const runs = runClassesOf(cy, 'web#build');
      const predictions = predictionClassesOf(cy, 'web#build');

      expect([...runs, ...predictions]).toStrictEqual(['run-passed', 'predict-cached']);
    });
  });

  describe('GIVEN a drawn task whose id is a key every object inherits', () => {
    beforeEach(() => {
      const tasks = [taskOf('toString', [])];
      const drawing: TaskDrawing = { ...DRAWING, tasks };

      cy = cytoscape({ headless: true });
      canvas = createTaskCanvas(cy);
      canvas.show(drawing);
    });

    it('WHEN its word is dropped from the record THEN that task carries no predict class', () => {
      const predicted = Object.fromEntries<GraphPrediction>([['toString', 'cached']]);

      canvas.predictions(predicted);
      canvas.predictions({});

      expect(predictionClassesOf(cy, 'toString')).toStrictEqual([]);
    });
  });

  describe('GIVEN a styled canvas with glyphs', () => {
    beforeEach(() => {
      const layout = { name: 'preset', fit: false };
      const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', true);

      cy = cytoscape({ headless: true, styleEnabled: true, style, layout });
      canvas = createTaskCanvas(cy);
      canvas.show(DRAWING);
      canvas.runStates({ 'web#build': 'passed' });
      canvas.predictions({ 'web#build': 'cached' });
    });

    it('WHEN web#build passed and is predicted cached THEN its label starts with the history glyph', () => {
      const label = String(cy.getElementById('web#build').style('label'));

      expect(label.startsWith(HISTORY)).toBe(true);
    });

    it('WHEN web#build passed and is predicted cached THEN its outline is still the passed colour', () => {
      expect(cy.getElementById('web#build').style('outline-color')).toBe('rgb(0,255,17)');
    });
  });

  describe('GIVEN the task rules', () => {
    it('WHEN their selectors are read THEN none mentions predict', () => {
      const selectors = taskRulesOf(CANVAS_COLORS, {}, null).map((rule) => rule.selector);

      expect(selectors.some((selector) => selector.includes('predict'))).toBe(false);
    });
  });
});
