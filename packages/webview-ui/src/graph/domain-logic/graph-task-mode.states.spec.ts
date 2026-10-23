import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskControlsActions } from '../common/task-controls.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { TASK_CHAIN_STUB, TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { taskLayoutKeyOf } from '../utils/elk-task-graph.util.ts';

/** `web#build` chosen at depth 1: itself and the `api#build` it needs. */
const KEY = taskLayoutKeyOf(TASK_CHAIN_STUB, new Set(['api#build', 'web#build']));

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 10, y: 120 };

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT };

const controlsActionsOf = (rig: TaskModeRig): TaskControlsActions | undefined => rig.controlsOf.mock.lastCall?.[0];

describe('FEATURE: GraphTaskMode across page states', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({}, 'packages')));
    mode = new GraphTaskMode(rig.deps);
    mode.received(TASK_STATE_STUB, 7);
    mode.toggle(8);
  });

  describe('GIVEN task mode entered with the chain run in flight', () => {
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

    it('WHEN the task Controls close THEN the canvas re-measures and controlsOpen false is saved', () => {
      rig.view.resize.mockClear();
      controlsActionsOf(rig)?.onToggle(false);

      expect(rig.view.resize).toHaveBeenCalledOnce();
      expect(rig.modes.current()).toMatchObject({ controlsOpen: false });
    });
  });
});
