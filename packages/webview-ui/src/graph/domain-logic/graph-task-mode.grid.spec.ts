import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewMode, TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskControlsActions } from '../common/task-controls.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { GROUPED_NAMING_STUB, SINGLE_TASK_STATE_STUB, TASK_STATE_STUB, WEB_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

const checksOf = (target: TaskModeRig): TaskControlsActions | undefined => target.controlsOf.mock.lastCall?.[0];

const APP_BUILD = taskOf('app#build', []);

const APP_DEV = scriptOf('app#dev', []);

/** One turbo task and one script, with scripts hidden. */
const HIDDEN_STATE: GraphReady = { ...TASK_STATE_STUB, tasks: [APP_BUILD, APP_DEV], scriptsShown: false };

/** The same listing with scripts shown: the same shown ids, so the same layout key. */
const SHOWN_STATE: GraphReady = { ...HIDDEN_STATE, scriptsShown: true };

describe('FEATURE: GraphTaskMode feeds the Projects grid', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;

  const open = (task: Partial<TaskViewState> = { chosen: ['app#build'] }, viewMode: GraphViewMode = 'tasks'): void => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };
    const saved = taskSavedOf(task, viewMode);

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

  describe('GIVEN task mode on app#build with the cap lifted, a check reports', () => {
    beforeEach(() => {
      open({ chosen: ['app#build'], capLifted: true });
      mode.received(SHOWN_STATE, 7);
    });

    it('WHEN app#dev is checked THEN it joins the choice, the cap stays lifted and one new layout run starts', () => {
      const runs = rig.runs.count();

      checksOf(rig)?.onCheck(['app#dev'], true);

      expect(rig.modes.task()).toMatchObject({ chosen: ['app#build', 'app#dev'], capLifted: true });
      expect(rig.runs.count()).toBe(runs + 1);
    });

    it('WHEN the only chosen task is unchecked THEN the choice is empty, the prompt shows and the layout is cleared', () => {
      checksOf(rig)?.onCheck(['app#build'], false);

      expect(rig.modes.task()).toMatchObject({ chosen: [], capLifted: true });
      expect(rig.panel.show).toHaveBeenLastCalledWith({ isEmpty: true, hiddenCount: 0, knownCount: 2 });
      expect(rig.view.tasks.clear).toHaveBeenCalled();
    });
  });

  describe('GIVEN a hidden script chosen next to app#build', () => {
    it('WHEN app#build is unchecked THEN the hidden script id stays in the choice', () => {
      open({ chosen: ['app#dev', 'app#build'] });
      mode.received(HIDDEN_STATE, 7);

      checksOf(rig)?.onCheck(['app#build'], false);

      expect(rig.modes.task()).toMatchObject({ chosen: ['app#dev'] });
    });
  });

  describe('GIVEN a single-package state', () => {
    it('WHEN the saved choice names no pooled task and one task is unchecked THEN the other pool tasks stay chosen', () => {
      open({ chosen: ['gone#x'] });
      mode.received(SINGLE_TASK_STATE_STUB, 7);

      checksOf(rig)?.onCheck(['//#lint'], false);

      expect(rig.modes.task()).toMatchObject({ chosen: ['//#build'] });
    });

    it('WHEN every task is chosen and every task is unchecked THEN the choice is empty and every task is still drawn, with no prompt', () => {
      open({ chosen: ['//#build', '//#lint'] });
      mode.received(SINGLE_TASK_STATE_STUB, 7);

      checksOf(rig)?.onCheck(['//#build', '//#lint'], false);

      expect(rig.modes.task()).toMatchObject({ chosen: [] });
      expect(rig.panel.show).toHaveBeenLastCalledWith({ isEmpty: false, hiddenCount: 0, knownCount: 2 });
    });
  });

  describe('GIVEN the cap lifted on app#build', () => {
    const resets: [string, GraphViewMode, (target: GraphTaskMode) => void][] = [
      ['showTasks', 'tasks', (target): void => target.showTasks(['app#build'], 8)],
      ['enter from a selected package', 'packages', (target): void => target.enter(8)],
      ['the panel Show every task', 'tasks', (): void => rig.panelOf.mock.lastCall?.[0].onShowEvery(8)],
      ['a showTasks of another task', 'tasks', (target): void => target.showTasks(['app#dev'], 8)]
    ];

    it.each(resets)('WHEN %s runs THEN the cap is no longer lifted', (_title, viewMode, run) => {
      open({ chosen: ['app#build'], capLifted: true }, viewMode);
      rig.selectedPackage.mockReturnValue('app');
      mode.received(SHOWN_STATE, 7);

      run(mode);

      expect(rig.modes.task()).toMatchObject({ capLifted: false });
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
