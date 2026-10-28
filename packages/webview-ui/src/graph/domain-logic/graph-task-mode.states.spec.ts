import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphReady, GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FlowEdgeGeometry } from '../common/flow.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import type { TaskControlsActions } from '../common/task-controls.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import {
  API_BUILD_STUB,
  SINGLE_TASK_STATE_STUB,
  TASK_CHAIN_STUB,
  TASK_STATE_STUB,
  WEB_BUILD_STUB,
  WEB_LINT_STUB
} from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { fanOf } from '../test/utils/shown-set.spec.util.ts';
import { taskLayoutKeyOf } from '../utils/elk-task-graph.util.ts';

const NO_COUNTS = new Map<string, number>();

/** `web#build` chosen at depth 1: itself and the `api#build` it needs. */
const KEY = taskLayoutKeyOf(TASK_CHAIN_STUB, new Set(['api#build', 'web#build']), NO_COUNTS);

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

const SINGLE_KEY = taskLayoutKeyOf(SINGLE_TASK_STATE_STUB.tasks, new Set(['//#build', '//#lint']), NO_COUNTS);

const SINGLE_POSITIONS: Positions = { '//#build': API_AT, '//#lint': WEB_AT };

const drawnOf = (rig: TaskModeRig): TaskDrawing | undefined => rig.view.tasks.show.mock.lastCall?.[0];

const controlsActionsOf = (rig: TaskModeRig): TaskControlsActions | undefined => rig.controlsOf.mock.lastCall?.[0];

/** The ids of the rows Controls listed last. */
const listedIdsOf = (rig: TaskModeRig): string[] | undefined => {
  const rows = rig.controls.setRows.mock.lastCall?.[0];

  return rows?.map((task) => task.id);
};

/** The single-package root after its package.json `name` changed: the same tasks, so the same layout key. */
const RENAMED_STATE: GraphReady = { ...SINGLE_TASK_STATE_STUB, rootLabel: 'renamed-app' };

const ALL_IDS = ['//#build', '//#lint'];

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
      mode.enter(8);
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

    it('WHEN enter is called while task mode is on THEN no run starts, the page is not shown again and nothing exits', () => {
      mode.enter(9);

      expect(rig.runs.count()).toBe(1);
      expect(rig.screen.showGraph).toHaveBeenCalledOnce();
      expect(rig.onExit).not.toHaveBeenCalled();
    });

    it('WHEN task mode is left and the chain run lands THEN nothing is drawn', async () => {
      mode.leave();
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
      mode.enter(8);
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

  describe('GIVEN package mode', () => {
    beforeEach(() => {
      open(taskSavedOf({}, 'packages'));
      mode.received(TASK_STATE_STUB, 7);
    });

    it('WHEN leave is called THEN onExit is not called and the panel does not exit', () => {
      mode.leave();

      expect(rig.onExit).not.toHaveBeenCalled();
      expect(rig.panel.exit).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a restored panel whose saved view says packages, with web#build chosen', () => {
    beforeEach(() => {
      open(taskSavedOf({}, 'packages'));
      mode.received(SINGLE_TASK_STATE_STUB, 7);
      mode.enter(8);
    });

    it('WHEN a single-package state is received and entered THEN every task is listed and nothing leaves task mode', () => {
      expect(listedIdsOf(rig)).toStrictEqual(ALL_IDS);
      expect(rig.panel.exit).not.toHaveBeenCalled();
      expect(rig.onExit).not.toHaveBeenCalled();
    });

    it('WHEN the same state arrives again in task mode THEN the shown tasks are not laid out again', () => {
      mode.received(SINGLE_TASK_STATE_STUB, 9);

      expect(rig.runs.count()).toBe(1);
      expect(rig.controls.setRows).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN task mode with only ids that no longer exist chosen', () => {
    it('WHEN the single-package state arrives THEN every task is listed', () => {
      open(taskSavedOf({ chosen: ['//#gone'] }));
      mode.received(SINGLE_TASK_STATE_STUB, 7);

      expect(listedIdsOf(rig)).toStrictEqual(ALL_IDS);
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
      expect(rig.panel.show).toHaveBeenLastCalledWith({ isEmpty: false, hiddenCount: 301, knownCount: 302 });
    });
  });

  describe('GIVEN task mode entered on the single-package root single-app', () => {
    beforeEach(() => {
      open(taskSavedOf({ chosen: [] }));
      mode.received(SINGLE_TASK_STATE_STUB, 7);
    });

    it('WHEN the rows are listed THEN Controls gets the root label', () => {
      expect(rig.controls.setRows).toHaveBeenLastCalledWith(SINGLE_TASK_STATE_STUB.tasks, 'single-app');
    });

    it('WHEN the layout lands THEN the canvas draws with the root label', async () => {
      await rig.runs.settle(0, resultOf(SINGLE_KEY, SINGLE_POSITIONS));

      expect(drawnOf(rig)?.rootLabel).toBe('single-app');
    });

    it('WHEN the same tasks arrive under a renamed root THEN Controls gets the new label', () => {
      mode.received(RENAMED_STATE, 8);

      expect(rig.controls.setRows).toHaveBeenLastCalledWith(RENAMED_STATE.tasks, 'renamed-app');
    });

    it('WHEN the same tasks arrive under a renamed root after the layout landed THEN the canvas draws with the new label', async () => {
      await rig.runs.settle(0, resultOf(SINGLE_KEY, SINGLE_POSITIONS));
      mode.received(RENAMED_STATE, 8);

      expect(drawnOf(rig)?.rootLabel).toBe('renamed-app');
    });

    it('WHEN a row is picked THEN the side panel model carries the root label', () => {
      controlsActionsOf(rig)?.onPick('//#build');

      expect(rig.details.show).toHaveBeenLastCalledWith(expect.objectContaining({ rootLabel: 'single-app' }));
    });
  });

  describe('GIVEN a monorepo state', () => {
    it('WHEN task mode lists its rows THEN Controls gets no root label', () => {
      open(taskSavedOf({}));
      mode.received(TASK_STATE_STUB, 7);

      expect(rig.controls.setRows).toHaveBeenLastCalledWith(expect.any(Array), null);
    });
  });
});
