import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskControlsActions, TaskViewChecks } from '../common/task-controls.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { GROUPED_NAMING_STUB, SINGLE_TASK_STATE_STUB, TASK_CHAIN_STUB, TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { taskLayoutKeyOf } from '../utils/elk-task-graph.util.ts';

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 10, y: 120 };

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT };

/** `web#build` chosen at depth 1: itself and the `api#build` it needs. */
const SHOWN = new Set(['api#build', 'web#build']);

const GROUPED_KEY = taskLayoutKeyOf(TASK_CHAIN_STUB, SHOWN, new Map(), GROUPED_NAMING_STUB);

/** What `TASK_STATE_STUB` shows: scopes and scripts on, no script listed, a monorepo under a grouped saved view. */
const STUB_CHECKS: TaskViewChecks = { grouped: true, canGroup: true, scopeShown: true, scriptsShown: true, hasScripts: false };

describe('FEATURE: GraphTaskMode View checkboxes', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  const actionsOf = (): TaskControlsActions => {
    const actions = rig.controlsOf.mock.lastCall?.[0];

    if (actions === undefined) throw new Error('task mode built no Controls');

    return actions;
  };

  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({})));
    mode = new GraphTaskMode(rig.deps);
  });

  describe('GIVEN a grouped task layout drawn', () => {
    beforeEach(async () => {
      mode.received(TASK_STATE_STUB, 7);
      await rig.runs.settle(0, resultOf(GROUPED_KEY, POSITIONS));
    });

    it('WHEN Group by folder is unticked THEN the saved view is ungrouped and exactly one new layout runs', () => {
      actionsOf().onGrouping(false);

      expect(rig.modes.current()?.grouped).toBe(false);
      expect(rig.runs.count()).toBe(2);
    });

    it('WHEN it is unticked and ticked again THEN the grouped layout comes from memory with no run and the canvas draws grouped', async () => {
      actionsOf().onGrouping(false);
      await rig.runs.settle(1, resultOf(mode.layout.key() ?? '', POSITIONS));
      actionsOf().onGrouping(true);

      expect(rig.runs.count()).toBe(2);
      expect(rig.view.tasks.show.mock.lastCall?.[0].naming.grouped).toBe(true);
    });

    it('WHEN Show scripts is ticked THEN only setViewToggle(scripts, true) is posted, with no layout run and nothing saved', () => {
      const saves = vi.spyOn(rig.modes, 'saveTask');

      actionsOf().onViewToggle('scripts', true);

      expect(rig.posts()).toStrictEqual([{ type: 'setViewToggle', toggle: 'scripts', shown: true }]);
      expect(rig.runs.count()).toBe(1);
      expect(saves).not.toHaveBeenCalled();
    });

    it('WHEN Show package scopes is unticked THEN only setViewToggle(scope, false) is posted', () => {
      actionsOf().onViewToggle('scope', false);

      expect(rig.posts()).toStrictEqual([{ type: 'setViewToggle', toggle: 'scope', shown: false }]);
    });
  });

  describe('GIVEN task mode is active', () => {
    it('WHEN a graph state arrives THEN the View boxes are set to the memory checks', () => {
      mode.received(TASK_STATE_STUB, 7);

      expect(rig.controls.setView).toHaveBeenLastCalledWith(STUB_CHECKS);
    });

    it('WHEN a second state with the same key arrives THEN the View boxes are set again', () => {
      mode.received(TASK_STATE_STUB, 7);

      const before = rig.controls.setView.mock.calls.length;

      mode.received({ ...TASK_STATE_STUB, scopeShown: true }, 9);

      expect(rig.controls.setView.mock.calls).toHaveLength(before + 1);
    });

    it('WHEN a single-package state arrives THEN Group by folder does not apply', () => {
      mode.received(SINGLE_TASK_STATE_STUB, 7);

      expect(rig.controls.setView).toHaveBeenLastCalledWith(expect.objectContaining({ canGroup: false }));
    });
  });

  describe('GIVEN the package graph is showing', () => {
    beforeEach(() => {
      const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

      rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({}, 'packages')));
      mode = new GraphTaskMode(rig.deps);
    });

    it('WHEN a graph state arrives THEN the View boxes are not touched', () => {
      mode.received(TASK_STATE_STUB, 7);

      expect(rig.controls.setView).not.toHaveBeenCalled();
    });

    it('WHEN task mode is entered THEN the View boxes are set after the panel is shown', () => {
      mode.received(TASK_STATE_STUB, 7);
      mode.enter(9);

      const [entered] = rig.controls.enter.mock.invocationCallOrder;
      const [viewed] = rig.controls.setView.mock.invocationCallOrder;

      expect(viewed).toBeGreaterThan(entered ?? Infinity);
      expect(rig.controls.setView).toHaveBeenCalledWith(STUB_CHECKS);
    });
  });
});
