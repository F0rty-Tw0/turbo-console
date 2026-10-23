import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { MORE_TASKS_STATE_STUB, TASK_CHAIN_STUB, TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { TASK_CAMERA, taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { taskLayoutKeyOf } from '../utils/elk-task-graph.util.ts';

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 10, y: 120 };

const DRAGGED_AT: Position = { x: 200, y: 300 };

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT };

const DRAGGED: Positions = { 'api#build': API_AT, 'web#build': DRAGGED_AT };

/** `web#build` chosen at depth 1: itself and the `api#build` it needs. */
const SHOWN = new Set(['api#build', 'web#build']);

const CHAIN: GraphTask[] = TASK_CHAIN_STUB.filter((task) => SHOWN.has(task.id));

const KEY = taskLayoutKeyOf(TASK_CHAIN_STUB, SHOWN);

/** The chain and `web#test`, the one dependent hop of `web#build`. */
const MORE_KEY = taskLayoutKeyOf(MORE_TASKS_STATE_STUB.tasks, new Set([...SHOWN, 'web#test']));

const SAVED_PAN: Position = { x: -40, y: 60 };

/** The rig over a real `ViewStateModes` that starts from `saved`. */
const rigOf = (saved: GraphViewState): TaskModeRig => {
  const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };
  const modes = new ViewStateModes(saver, saved);

  return taskModeRigOf(modes);
};

const drawnOf = (rig: TaskModeRig): TaskDrawing | undefined => rig.view.tasks.show.mock.lastCall?.[0];

describe('FEATURE: GraphTaskMode', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  const open = (layoutKey = ''): void => {
    rig = rigOf(taskSavedOf({ layoutKey, zoom: 1.25, pan: SAVED_PAN }));
    mode = new GraphTaskMode(rig.deps);
  };

  describe('GIVEN task mode saved with web#build chosen and no layout yet', () => {
    beforeEach(() => {
      open();
      mode.received(TASK_STATE_STUB, 7);
    });

    it('WHEN a state arrives THEN the graph view shows and one run of the chain starts under its key', () => {
      expect(mode.isActive()).toBe(true);
      expect(rig.screen.showGraph).toHaveBeenCalledExactlyOnceWith(false);
      expect(rig.frames.start).toHaveBeenCalledExactlyOnceWith(7);
      expect(rig.runs.count()).toBe(1);
    });

    it('WHEN its layout finishes THEN the chain is drawn at the result and nothing is posted', async () => {
      await rig.runs.settle(0, resultOf(KEY, POSITIONS));

      expect(drawnOf(rig)?.tasks).toStrictEqual(CHAIN);
      expect(drawnOf(rig)?.positions).toStrictEqual(POSITIONS);
      expect(rig.posts()).toStrictEqual([]);
    });

    it('WHEN its layout finishes THEN the camera fits, then the frame clock is armed', async () => {
      await rig.runs.settle(0, resultOf(KEY, POSITIONS));

      expect(rig.calls()).toStrictEqual(['show', 'fit', 'arm']);
    });

    it('WHEN its layout finishes THEN the task view saves the key and the camera', async () => {
      await rig.runs.settle(0, resultOf(KEY, POSITIONS));

      expect(rig.modes.task()).toMatchObject({ layoutKey: KEY, ...TASK_CAMERA });
    });

    it('WHEN the run resolves null THEN nothing is placed', async () => {
      await rig.runs.settle(0, null);

      expect(rig.calls()).toStrictEqual([]);
      expect(mode.engine()).toBeNull();
    });

    it('WHEN the runner falls back THEN that layout is placed and the engine is fallback', async () => {
      await rig.runs.settle(0, resultOf(KEY, POSITIONS, 'fallback'));

      expect(drawnOf(rig)?.positions).toStrictEqual(POSITIONS);
      expect(mode.engine()).toBe('fallback');
      expect(rig.screen.showNotice).toHaveBeenLastCalledWith({ kind: 'fallback' });
    });

    it('WHEN the camera moves before any layout is placed THEN the task view keeps its camera', () => {
      mode.saveCamera();

      expect(rig.modes.task()).toMatchObject({ zoom: 1.25, pan: SAVED_PAN, layoutKey: '' });
    });
  });

  describe('GIVEN the chain is placed', () => {
    beforeEach(async () => {
      open();
      mode.received(TASK_STATE_STUB, 7);
      await rig.runs.settle(0, resultOf(KEY, POSITIONS));
    });

    it('WHEN the same tasks arrive under another hash THEN no run starts and the camera stays', () => {
      const rehashed = { ...TASK_STATE_STUB, hash: 'h2' };

      mode.received(rehashed, 9);

      expect(rig.runs.count()).toBe(1);
      expect(rig.view.fit).toHaveBeenCalledOnce();
      expect(rig.frames.start).toHaveBeenCalledOnce();
    });

    it('WHEN a new dependent of web#build arrives THEN a run of the larger graph starts', () => {
      mode.received(MORE_TASKS_STATE_STUB, 9);

      expect(rig.runs.count()).toBe(2);
      expect(rig.frames.start).toHaveBeenLastCalledWith(9);
    });

    it('WHEN the camera moves THEN the task view saves it', () => {
      const moved = { zoom: 2, pan: SAVED_PAN };

      rig.view.viewport.mockReturnValue(moved);
      mode.saveCamera();

      expect(rig.modes.task()).toMatchObject(moved);
    });

    it('WHEN Re-layout is pressed THEN a fresh run is placed and the camera fits', async () => {
      const relaid = mode.relayout();

      await rig.runs.settle(1, resultOf(KEY, DRAGGED));
      await relaid;

      expect(drawnOf(rig)?.positions).toStrictEqual(DRAGGED);
      expect(rig.view.fit).toHaveBeenCalledTimes(2);
    });

    it('WHEN a task is dragged, another graph shown and the chain again THEN the dragged centres return with no run', async () => {
      rig.view.tasks.positions.mockReturnValue(DRAGGED);
      mode.dragged();
      mode.received(MORE_TASKS_STATE_STUB, 9);
      await rig.runs.settle(1, resultOf(MORE_KEY, POSITIONS));
      mode.received(TASK_STATE_STUB, 11);

      expect(rig.runs.count()).toBe(2);
      expect(drawnOf(rig)?.positions).toStrictEqual(DRAGGED);
    });
  });

  describe('GIVEN task mode saved with the layout key of the chain and a camera', () => {
    beforeEach(() => {
      open(KEY);
      mode.received(TASK_STATE_STUB, 7);
    });

    it('WHEN its layout finishes THEN the saved camera is restored instead of a fit', async () => {
      await rig.runs.settle(0, resultOf(KEY, POSITIONS));

      expect(rig.view.setViewport).toHaveBeenCalledExactlyOnceWith(1.25, SAVED_PAN);
      expect(rig.calls()).toStrictEqual(['show', 'setViewport', 'arm']);
    });
  });

  describe('GIVEN package mode', () => {
    beforeEach(() => {
      rig = rigOf(taskSavedOf({}, 'packages'));
      mode = new GraphTaskMode(rig.deps);
    });

    it('WHEN a state arrives THEN task mode is not active and nothing runs or shows', () => {
      mode.received(TASK_STATE_STUB, 7);

      expect(mode.isActive()).toBe(false);
      expect(rig.runs.count()).toBe(0);
      expect(rig.screen.showGraph).not.toHaveBeenCalled();
    });
  });
});
