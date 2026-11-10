import cytoscape from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphController } from './graph-controller.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import { createTaskCanvas } from '../data-access/graph-task-view.ts';
import type { PackageSideDepsMock } from '../test/common/graph-package-side.type.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { NAMING_STUB, SINGLE_TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const RUNS = { '//#build': 'passed' };

const MIXED = { 'web#build': 'cached', 'web#lint': 'bogus' };

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const WEB_BUILD = taskOf('web#build', []);

const WEB_AT: Position = { x: 10, y: 20 };

const POSITIONS: Positions = { 'web#build': WEB_AT };

const PRESET = { name: 'preset', fit: false };

const DRAWING: TaskDrawing = {
  tasks: [WEB_BUILD],
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

describe('FEATURE: createGraphController predictions', () => {
  let mock: PackageSideDepsMock;

  beforeEach(() => {
    stubPackageSideGlobals();
    mock = packageSideDepsMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GIVEN a state was received', () => {
    it.each([
      ['a record', MIXED, { 'web#build': 'cached' }],
      ['a non-object', 5, {}],
      ['an empty record', {}, {}]
    ])('WHEN a runs message arrives with %s THEN the canvas gets only its known words', (_name, predictions, expected) => {
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'state', state: SINGLE_TASK_STATE_STUB });
      controller.receive({ type: 'runs', runs: RUNS, predictions });

      expect(mock.view.tasks.predictions).toHaveBeenLastCalledWith(expected);
    });

    it('WHEN a runs message arrives with a non-object predictions THEN its runs are still applied', () => {
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'state', state: SINGLE_TASK_STATE_STUB });
      controller.receive({ type: 'runs', runs: RUNS, predictions: 5 });

      expect(mock.view.tasks.runStates).toHaveBeenLastCalledWith(RUNS);
    });

    it('WHEN a runs message without predictions arrives THEN the canvas gets null, which keeps its marks', () => {
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'state', state: SINGLE_TASK_STATE_STUB });
      controller.receive({ type: 'runs', runs: RUNS });

      expect(mock.view.tasks.predictions).toHaveBeenLastCalledWith(null);
    });

    it('WHEN a record then {} arrive THEN the canvas gets {}', () => {
      const controller = createGraphController(mock.deps);

      controller.receive({ type: 'state', state: SINGLE_TASK_STATE_STUB });
      controller.receive({ type: 'runs', runs: RUNS, predictions: MIXED });
      controller.receive({ type: 'runs', runs: RUNS, predictions: {} });

      expect(mock.view.tasks.predictions).toHaveBeenLastCalledWith({});
    });
  });

  describe('GIVEN a real task canvas', () => {
    it('WHEN a record, then runs without predictions, then a new task layout arrive THEN the task is marked from the record', () => {
      const cy = cytoscape({ headless: true, layout: PRESET });
      const canvas = createTaskCanvas(cy);
      const controller = createGraphController(mock.deps);

      vi.mocked(mock.view.tasks.predictions).mockImplementation(canvas.predictions);
      controller.receive({ type: 'state', state: SINGLE_TASK_STATE_STUB });
      controller.receive({ type: 'runs', runs: RUNS, predictions: MIXED });
      controller.receive({ type: 'runs', runs: RUNS });
      canvas.show(DRAWING);

      expect(cy.getElementById('web#build').hasClass('predict-cached')).toBe(true);

      cy.destroy();
    });
  });
});
