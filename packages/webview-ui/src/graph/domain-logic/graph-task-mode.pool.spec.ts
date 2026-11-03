import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import { UNKNOWN_TASKS_TEXT } from '../common/graph-task.const.ts';
import type { TaskPanelActions } from '../common/graph-task.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { SINGLE_TASK_STATE_STUB, TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

const APP_BUILD = taskOf('app#build', []);

const LIB_BUILD = taskOf('lib#build', []);

const APP_DEV = scriptOf('app#dev', []);

/** Two turbo tasks and `app#dev`, a package script, with scripts hidden. */
const POOL_STATE: GraphReady = { ...TASK_STATE_STUB, tasks: [APP_BUILD, APP_DEV, LIB_BUILD], scriptsShown: false };

const ROOT_SCRIPTS = [scriptOf('//#dev', []), scriptOf('//#start', [])];

/** A single-package root whose tasks are both scripts, with scripts hidden. */
const ALL_SCRIPTS_STATE: GraphReady = {
  ...SINGLE_TASK_STATE_STUB,
  tasks: ROOT_SCRIPTS,
  scriptsShown: false
};

const panelActionsOf = (rig: TaskModeRig): TaskPanelActions | undefined => rig.panelOf.mock.lastCall?.[0];

const rigOf = (): TaskModeRig => {
  const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };
  const modes = new ViewStateModes(saver, taskSavedOf({ chosen: [] }, 'packages'));
  const rig = taskModeRigOf(modes);

  return rig;
};

describe('FEATURE: GraphTaskMode over the task pool', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  const receive = (state: GraphReady): void => {
    rig = rigOf();
    mode = new GraphTaskMode(rig.deps);
    mode.received(state, 7);
  };

  describe('GIVEN scripts hidden and a script in the listing', () => {
    beforeEach(() => {
      receive(POOL_STATE);
    });

    describe('WHEN showTasks names the hidden script', () => {
      beforeEach(() => {
        mode.showTasks(['app#dev'], 8);
      });

      it('THEN there is no unknown-tasks notice', () => {
        expect(rig.panel.notice).not.toHaveBeenCalledWith(UNKNOWN_TASKS_TEXT);
      });

      it('THEN the panel shows empty over the two known tasks', () => {
        expect(rig.panel.show).toHaveBeenLastCalledWith({ isEmpty: true, hiddenCount: 0, knownCount: 2 });
      });

      it('THEN nothing is laid out', () => {
        expect(rig.runs.count()).toBe(0);
      });
    });

    describe('WHEN showTasks names the hidden script and app#build', () => {
      beforeEach(() => {
        mode.showTasks(['app#dev', 'app#build'], 8);
      });

      it('THEN nothing is reported dropped', () => {
        expect(rig.panel.notice).toHaveBeenLastCalledWith(null);
      });

      it('THEN both stay chosen', () => {
        expect(rig.modes.task()?.chosen).toStrictEqual(['app#dev', 'app#build']);
      });

      it('THEN the panel shows app#build over the two known tasks', () => {
        expect(rig.panel.show).toHaveBeenLastCalledWith({ isEmpty: false, hiddenCount: 0, knownCount: 2 });
      });
    });

    it('WHEN Show every task is clicked THEN it chooses and counts the pool, not the listing', () => {
      panelActionsOf(rig)?.onShowEvery(9);

      expect(rig.modes.task()?.chosen).toStrictEqual(['app#build', 'lib#build']);
      expect(rig.panel.show).toHaveBeenLastCalledWith({ isEmpty: false, hiddenCount: 0, knownCount: 2 });
    });

    it('WHEN a package with a turbo task and a script is asked for its tasks THEN only the turbo task comes back', () => {
      expect(mode.packageTaskIds('app')).toStrictEqual(['app#build']);
    });
  });

  describe('GIVEN a package whose only tasks are hidden scripts', () => {
    it('WHEN it is asked for its tasks THEN it has no tasks', () => {
      receive({ ...POOL_STATE, tasks: [scriptOf('app#dev')] });

      expect(mode.packageTaskIds('app')).toStrictEqual([]);
    });
  });

  describe('GIVEN a single-package root whose tasks are all scripts and scripts hidden', () => {
    it('WHEN task mode opens THEN the fallback chooses nothing and the pool is empty', () => {
      receive(ALL_SCRIPTS_STATE);
      mode.enter(8);

      expect(rig.panel.show).toHaveBeenLastCalledWith({ isEmpty: true, hiddenCount: 0, knownCount: 0 });
    });
  });
});
