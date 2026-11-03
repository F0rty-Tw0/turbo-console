import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { GROUPED_NAMING_STUB, TASK_STATE_STUB, WEB_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

const APP_BUILD = taskOf('app#build', []);

const APP_DEV = scriptOf('app#dev', []);

/** One turbo task and one script, with scripts hidden. */
const HIDDEN_STATE: GraphReady = { ...TASK_STATE_STUB, tasks: [APP_BUILD, APP_DEV], scriptsShown: false };

/** The same listing with scripts shown: the same shown ids, so the same layout key. */
const SHOWN_STATE: GraphReady = { ...HIDDEN_STATE, scriptsShown: true };

describe('FEATURE: GraphTaskMode feeds the Projects grid', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  const open = (): void => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };
    const saved = taskSavedOf({ chosen: ['app#build'] }, 'tasks');

    rig = taskModeRigOf(new ViewStateModes(saver, saved));
    mode = new GraphTaskMode(rig.deps);
  };

  describe('GIVEN task mode on app#build with scripts hidden', () => {
    beforeEach(() => {
      open();
      mode.received(HIDDEN_STATE, 7);
    });

    it('WHEN the state is drawn THEN the grid gets the pool, the choice, the drawn ids, the naming and the root label', () => {
      const facts = rig.controls.setProjects.mock.lastCall?.[0];

      expect(facts).toStrictEqual({
        tasks: [APP_BUILD],
        chosen: new Set(['app#build']),
        shown: new Set(['app#build']),
        naming: GROUPED_NAMING_STUB,
        rootLabel: null
      });
    });

    it('WHEN the same shown ids arrive again THEN the grid is set again', () => {
      mode.received(HIDDEN_STATE, 8);

      expect(rig.controls.setProjects).toHaveBeenCalledTimes(2);
    });

    it('WHEN the same shown ids arrive with scripts shown THEN the grid lists the script', () => {
      mode.received(SHOWN_STATE, 8);

      expect(rig.controls.setProjects).toHaveBeenLastCalledWith(expect.objectContaining({ tasks: [APP_BUILD, APP_DEV] }));
    });
  });

  describe('GIVEN package mode', () => {
    it('WHEN a state arrives THEN the grid is not set', () => {
      const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

      rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({ chosen: [WEB_BUILD_STUB.id] }, 'packages')));
      mode = new GraphTaskMode(rig.deps);
      mode.received(TASK_STATE_STUB, 7);

      expect(rig.controls.setProjects).not.toHaveBeenCalled();
    });
  });
});
