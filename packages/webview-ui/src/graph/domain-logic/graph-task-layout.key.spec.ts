import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskLayout } from './graph-task-layout.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskLayoutRequest, TaskNaming } from '../common/graph-task.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { NAMING_STUB, TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { taskLayoutKeyOf } from '../utils/elk-task-graph.util.ts';

const SAVED_ZOOM = 1.25;

const SAVED_PAN: Position = { x: 10, y: 20 };

const POSITIONS: Positions = { 'api#build': SAVED_PAN };

const SHOWN = new Set(['api#build']);

const NO_COUNTS = new Map<string, number>();

const UNGROUPED: TaskNaming = NAMING_STUB;

const GROUPED: TaskNaming = { ...NAMING_STUB, grouped: true, folders: new Map([['api', 'packages']]) };

const keyOf = (naming: TaskNaming): string => taskLayoutKeyOf(TASK_CHAIN_STUB, SHOWN, NO_COUNTS, naming);

const requestOf = (naming: TaskNaming): TaskLayoutRequest => {
  const request: TaskLayoutRequest = { tasks: TASK_CHAIN_STUB, shown: SHOWN, key: keyOf(naming), sizes: new Map(), naming };

  return request;
};

/** The key as it was saved before the naming bits and the layout version: the current key without both. */
const oldShapeOf = (naming: TaskNaming): string => keyOf(naming).replace(/,\[(true|false),(true|false),.*\],\d+\]$/, ']');

describe('FEATURE: GraphTaskLayout keyed by the naming bits', () => {
  let rig: TaskModeRig;

  const layoutSavedAs = (layoutKey: string, fitted: boolean): GraphTaskLayout => {
    const task = taskSavedOf({ layoutKey, fitted, zoom: SAVED_ZOOM, pan: SAVED_PAN }).task;

    return new GraphTaskLayout({
      ...rig.deps,
      saved: (): TaskViewState | null => task,
      rootLabel: (): null => null,
      onPlaced: vi.fn(),
      onDrawn: vi.fn()
    });
  };

  /** Shows `naming`'s layout and lands the run `index` that it starts. */
  const showAndLand = async (layout: GraphTaskLayout, naming: TaskNaming, index: number): Promise<void> => {
    const shown = layout.show(requestOf(naming));

    await rig.runs.settle(index, resultOf(keyOf(naming), POSITIONS));
    await shown;
  };

  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({})));
  });

  describe('GIVEN a saved camera whose layout key is the old shape', () => {
    it('WHEN the layout is shown THEN it opens once and restores nothing', async () => {
      const layout = layoutSavedAs(oldShapeOf(UNGROUPED), false);

      await showAndLand(layout, UNGROUPED, 0);

      expect(rig.view.open).toHaveBeenCalledOnce();
      expect(rig.view.fit).not.toHaveBeenCalled();
      expect(rig.view.setViewport).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a saved camera whose layout key is the current key at layout version 6, before the status cards', () => {
    it('WHEN the layout is shown THEN it opens once and the camera saved under the card-less sizes is not restored', async () => {
      const layout = layoutSavedAs(keyOf(UNGROUPED).replace(/,7\]$/, ',6]'), false);

      await showAndLand(layout, UNGROUPED, 0);

      expect(rig.view.open).toHaveBeenCalledOnce();
      expect(rig.view.setViewport).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a saved camera whose layout key equals the request key and was not fitted', () => {
    it('WHEN the layout is shown THEN the saved camera is restored', async () => {
      const layout = layoutSavedAs(keyOf(UNGROUPED), false);

      await showAndLand(layout, UNGROUPED, 0);

      expect(rig.view.setViewport).toHaveBeenCalledExactlyOnceWith(SAVED_ZOOM, SAVED_PAN);
      expect(rig.view.fit).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the layout shown for key A, then key B, then key A again', () => {
    let layout: GraphTaskLayout;

    beforeEach(async () => {
      layout = layoutSavedAs(keyOf(UNGROUPED), false);
      await showAndLand(layout, UNGROUPED, 0);
      await showAndLand(layout, GROUPED, 1);
      await layout.show(requestOf(UNGROUPED));
    });

    it('WHEN the third show lands THEN no ELK pass runs for it', () => {
      expect(rig.runs.count()).toBe(2);
    });

    it('WHEN the third show lands THEN the camera restores for key A and opens for key B', () => {
      expect(rig.view.setViewport).toHaveBeenCalledTimes(2);
      expect(rig.view.open).toHaveBeenCalledOnce();
      expect(rig.view.fit).not.toHaveBeenCalled();
    });
  });
});
