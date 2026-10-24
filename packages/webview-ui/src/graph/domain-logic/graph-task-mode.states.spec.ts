import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphReady, GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FlowEdgeGeometry } from '../common/flow.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskControlsActions } from '../common/task-controls.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { API_BUILD_STUB, TASK_CHAIN_STUB, TASK_STATE_STUB, WEB_BUILD_STUB, WEB_LINT_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { fanOf } from '../test/utils/shown-set.spec.util.ts';
import { taskLayoutKeyOf } from '../utils/elk-task-graph.util.ts';

/** `web#build` chosen at depth 1: itself and the `api#build` it needs. */
const KEY = taskLayoutKeyOf(TASK_CHAIN_STUB, new Set(['api#build', 'web#build']));

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 10, y: 120 };

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT };

const LIT_EDGE: FlowEdgeGeometry = { source: WEB_AT, target: API_AT, controlPoints: [] };

/** `web#build` with its package script edited: a new command it cannot run, under the same ids and so the same layout key. */
const EDITED_WEB_BUILD: GraphTask = { ...WEB_BUILD_STUB, command: 'vite build', isRunnable: false };

const EDITED_STATE: GraphReady = { ...TASK_STATE_STUB, tasks: [API_BUILD_STUB, EDITED_WEB_BUILD, WEB_LINT_STUB] };

/** `root#t` with `count` dependents, all one hop away, so past the cap only `root#t` is shown. */
const fanStateOf = (count: number): GraphReady => {
  const state: GraphReady = { ...TASK_STATE_STUB, tasks: fanOf(count, 0) };

  return state;
};

const controlsActionsOf = (rig: TaskModeRig): TaskControlsActions | undefined => rig.controlsOf.mock.lastCall?.[0];

describe('FEATURE: GraphTaskMode across page states', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  /** A task mode over a real `ViewStateModes` that starts from `saved`. */
  const open = (saved: GraphViewState): void => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, saved));
    mode = new GraphTaskMode(rig.deps);
  };

  describe('GIVEN task mode entered with the chain run in flight', () => {
    beforeEach(() => {
      open(taskSavedOf({}, 'packages'));
      mode.received(TASK_STATE_STUB, 7);
      mode.toggle(8);
    });

    describe('WHEN a message replaces the page and the same state arrives again', () => {
      beforeEach(() => {
        mode.suspend();
        mode.received(TASK_STATE_STUB, 9);
      });

      it('THEN the graph view shows again', () => {
        expect(rig.screen.showGraph).toHaveBeenCalledTimes(2);
      });

      it('THEN the task panel, Controls and details enter again', () => {
        expect(rig.panel.enter).toHaveBeenCalledTimes(2);
        expect(rig.controls.enter).toHaveBeenCalledTimes(2);
        expect(rig.details.enter).toHaveBeenCalledTimes(2);
      });

      it('THEN no second run starts', () => {
        expect(rig.runs.count()).toBe(1);
      });
    });

    it('WHEN the same state arrives with no message between THEN the graph view shows once', () => {
      mode.received(TASK_STATE_STUB, 9);

      expect(rig.screen.showGraph).toHaveBeenCalledOnce();
    });

    it('WHEN task mode is left and the chain run lands THEN nothing is drawn', async () => {
      mode.toggle(9);
      await rig.runs.settle(0, resultOf(KEY, POSITIONS));

      expect(rig.view.tasks.show).not.toHaveBeenCalled();
    });

    it('WHEN web#build is selected and its command is edited under the same key THEN the panel shows the new command, not runnable', () => {
      mode.selection.tapNode('web#build');
      mode.received(EDITED_STATE, 9);

      expect(rig.runs.count()).toBe(1);
      expect(rig.details.show.mock.lastCall?.[0]?.task).toStrictEqual(EDITED_WEB_BUILD);
    });

    it('WHEN the task Controls close THEN the canvas re-measures and controlsOpen false is saved', () => {
      rig.view.resize.mockClear();
      controlsActionsOf(rig)?.onToggle(false);

      expect(rig.view.resize).toHaveBeenCalledOnce();
      expect(rig.modes.current()).toMatchObject({ controlsOpen: false });
    });
  });

  describe('GIVEN package mode with web#build saved as selected and its chain lit once drawn', () => {
    beforeEach(() => {
      open(taskSavedOf({ selected: 'web#build' }, 'packages'));
      rig.view.flowEdges.mockReturnValue([LIT_EDGE]);
      mode.received(TASK_STATE_STUB, 7);
      mode.toggle(8);
      rig.flow.highlightChanged.mockClear();
    });

    it('WHEN the chain lands THEN the flow hears of the restored highlight after the layout stops it', async () => {
      await rig.runs.settle(0, resultOf(KEY, POSITIONS));

      const stoppedAt = rig.flow.stop.mock.invocationCallOrder.at(-1) ?? Number.NaN;
      const heardAt = rig.flow.highlightChanged.mock.invocationCallOrder.at(-1) ?? Number.NaN;

      expect(rig.flow.highlightChanged).toHaveBeenLastCalledWith(1);
      expect(stoppedAt).toBeLessThan(heardAt);
    });
  });

  describe('GIVEN root#t chosen over the cap and in flight', () => {
    beforeEach(() => {
      open(taskSavedOf({ chosen: ['root#t'] }));
      mode.received(fanStateOf(300), 7);
    });

    it('WHEN one more dependent arrives under the same key THEN the banner counts it', () => {
      mode.received(fanStateOf(301), 8);

      expect(rig.runs.count()).toBe(1);
      expect(rig.panel.show).toHaveBeenLastCalledWith({ isEmpty: false, hiddenCount: 301 });
    });
  });
});
