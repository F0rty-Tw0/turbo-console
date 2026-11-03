import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphReady, GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskControlsActions, TaskViewChecks } from '../common/task-controls.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import {
  GROUPED_NAMING_STUB,
  SINGLE_TASK_STATE_STUB,
  TASK_CHAIN_STUB,
  TASK_STATE_STUB,
  WEB_LINT_STUB
} from '../test/stubs/graph-task.stub.ts';
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

/** `web#dev`, a package script. */
const WEB_DEV: GraphTask = { ...WEB_LINT_STUB, id: 'web#dev', name: 'dev', isTurboTask: false };

/** `TASK_STATE_STUB` with scripts hidden. */
const SCRIPTS_HIDDEN: GraphReady = { ...TASK_STATE_STUB, scriptsShown: false };

/** `SCRIPTS_HIDDEN` listing `web#dev` too: the pool, and so the layout key, stay the same. */
const SCRIPT_LISTED: GraphReady = { ...SCRIPTS_HIDDEN, tasks: [...TASK_CHAIN_STUB, WEB_DEV] };

describe('FEATURE: GraphTaskMode View checkboxes', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  const actionsOf = (): TaskControlsActions => {
    const actions = rig.controlsOf.mock.lastCall?.[0];

    if (actions === undefined) throw new Error('task mode built no Controls');

    return actions;
  };

  const build = (savedMode: GraphViewMode): void => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({}, savedMode)));
    mode = new GraphTaskMode(rig.deps);
  };

  describe('GIVEN a grouped task layout drawn', () => {
    beforeEach(async (): Promise<void> => {
      build('tasks');
      mode.received(TASK_STATE_STUB, 7);
      await rig.runs.settle(0, resultOf(GROUPED_KEY, POSITIONS));
    });

    describe('WHEN Group by folder is unticked', () => {
      beforeEach((): void => {
        actionsOf().onGrouping(false);
      });

      it('THEN the saved view is ungrouped', () => {
        expect(rig.modes.current()?.grouped).toBe(false);
      });

      it('THEN exactly one new layout runs', () => {
        expect(rig.runs.count()).toBe(2);
      });
    });

    describe('WHEN it is unticked and ticked again', () => {
      beforeEach(async (): Promise<void> => {
        actionsOf().onGrouping(false);
        await rig.runs.settle(1, resultOf(mode.layout.key() ?? '', POSITIONS));
        actionsOf().onGrouping(true);
      });

      it('THEN the grouped layout comes from memory with no run', () => {
        expect(rig.runs.count()).toBe(2);
      });

      it('THEN the canvas draws grouped', () => {
        expect(rig.view.tasks.show.mock.lastCall?.[0].naming.grouped).toBe(true);
      });
    });

    describe('WHEN Show scripts is ticked', () => {
      let saves: ReturnType<typeof vi.spyOn>;

      beforeEach((): void => {
        saves = vi.spyOn(rig.modes, 'saveTask');
        actionsOf().onViewToggle('scripts', true);
      });

      it('THEN only setViewToggle(scripts, true) is posted', () => {
        expect(rig.posts()).toStrictEqual([{ type: 'setViewToggle', toggle: 'scripts', shown: true }]);
      });

      it('THEN no layout runs', () => {
        expect(rig.runs.count()).toBe(1);
      });

      it('THEN nothing is saved', () => {
        expect(saves).not.toHaveBeenCalled();
      });
    });

    it('WHEN Show package scopes is unticked THEN only setViewToggle(scope, false) is posted', () => {
      actionsOf().onViewToggle('scope', false);

      expect(rig.posts()).toStrictEqual([{ type: 'setViewToggle', toggle: 'scope', shown: false }]);
    });
  });

  describe('GIVEN task mode is active', () => {
    beforeEach((): void => {
      build('tasks');
    });

    it('WHEN a graph state arrives THEN the View boxes are set once to the memory checks', () => {
      mode.received(TASK_STATE_STUB, 7);

      expect(rig.controls.setView).toHaveBeenCalledExactlyOnceWith(STUB_CHECKS);
    });

    it('WHEN a same-key state lists a hidden script THEN Show scripts is offered', () => {
      mode.received(SCRIPTS_HIDDEN, 7);
      mode.received(SCRIPT_LISTED, 9);

      expect(rig.controls.setView).toHaveBeenLastCalledWith(expect.objectContaining({ hasScripts: true }));
    });

    it('WHEN a single-package state arrives THEN Group by folder does not apply', () => {
      mode.received(SINGLE_TASK_STATE_STUB, 7);

      expect(rig.controls.setView).toHaveBeenLastCalledWith(expect.objectContaining({ canGroup: false }));
    });
  });

  describe('GIVEN the package graph is showing', () => {
    beforeEach((): void => {
      build('packages');
    });

    it('WHEN a graph state arrives THEN the View boxes are not touched', () => {
      mode.received(TASK_STATE_STUB, 7);

      expect(rig.controls.setView).not.toHaveBeenCalled();
    });

    it('WHEN task mode is entered THEN the View boxes are set to the memory checks', () => {
      mode.received(TASK_STATE_STUB, 7);
      mode.enter(9);

      expect(rig.controls.setView).toHaveBeenCalledWith(STUB_CHECKS);
    });
  });
});
