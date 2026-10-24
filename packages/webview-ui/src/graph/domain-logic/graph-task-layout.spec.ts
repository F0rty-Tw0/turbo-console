import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskLayout } from './graph-task-layout.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import { TASK_LAYOUT_MEMORY } from '../common/graph-task.const.ts';
import type { TaskLayoutRequest } from '../common/graph-task.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';

const API_AT: Position = { x: 10, y: 20 };

const POSITIONS: Positions = { 'api#build': API_AT };

const SHOWN = new Set(['api#build']);

const PLACE_FAILED = new Error('cannot draw');

const requestOf = (key: string): TaskLayoutRequest => {
  const request: TaskLayoutRequest = { tasks: TASK_CHAIN_STUB, shown: SHOWN, key };

  return request;
};

const throwPlace = (): never => {
  throw PLACE_FAILED;
};

describe('FEATURE: GraphTaskLayout', () => {
  let rig: TaskModeRig;
  let layout: GraphTaskLayout;

  /** Shows the layout of `key` and lands it as the latest run. */
  const land = async (key: string): Promise<void> => {
    const shown = layout.show(requestOf(key));

    await rig.runs.settle(rig.runs.count() - 1, resultOf(key, POSITIONS));
    await shown;
  };

  /** Lands `count` layouts, keys `k0` to `k<count - 1>`, oldest first. */
  const landEach = async (count: number): Promise<void> => {
    for (let index = 0; index < count; index++) await land(`k${index}`);
  };

  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({})));
    layout = new GraphTaskLayout({ ...rig.deps, saved: (): null => null, onPlaced: vi.fn() });
  });

  describe('GIVEN the flow overlay', () => {
    it('WHEN a layout lands THEN the flow stops before the canvas draws it', async () => {
      await land('k0');

      const stoppedAt = rig.flow.stop.mock.invocationCallOrder[0] ?? Number.NaN;
      const shownAt = rig.view.tasks.show.mock.invocationCallOrder[0] ?? Number.NaN;

      expect(stoppedAt).toBeLessThan(shownAt);
    });

    it('WHEN the task canvas is cleared THEN the flow stops', () => {
      layout.clear();

      expect(rig.flow.stop).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN as many layouts landed as page memory keeps', () => {
    beforeEach(async () => {
      await landEach(TASK_LAYOUT_MEMORY);
    });

    it('WHEN the first key is shown again THEN it is placed from memory with no run', async () => {
      await layout.show(requestOf('k0'));

      expect(rig.runs.count()).toBe(TASK_LAYOUT_MEMORY);
    });

    it('WHEN one more lands and the first key is shown again THEN it is laid out afresh', async () => {
      await land('extra');
      void layout.show(requestOf('k0'));

      expect(rig.runs.count()).toBe(TASK_LAYOUT_MEMORY + 2);
    });

    it('WHEN the first key is shown again before one more lands THEN the first key stays in memory', async () => {
      await layout.show(requestOf('k0'));
      await land('extra');
      void layout.show(requestOf('k0'));

      expect(rig.runs.count()).toBe(TASK_LAYOUT_MEMORY + 1);
    });
  });

  describe('GIVEN a canvas that throws on drawing', () => {
    beforeEach(() => {
      rig.view.tasks.show.mockImplementation(throwPlace);
    });

    it('WHEN a run lands THEN the failure is reported, the canvas emptied and the key forgotten', async () => {
      await land('k0');

      expect(rig.onFailure).toHaveBeenCalledExactlyOnceWith(PLACE_FAILED);
      expect(rig.view.tasks.clear).toHaveBeenCalledOnce();
      expect(layout.key()).toBeNull();
    });

    it('WHEN Re-layout lands THEN the failure is reported', async () => {
      rig.view.tasks.show.mockReset();
      await land('k0');
      rig.view.tasks.show.mockImplementation(throwPlace);

      const relaid = layout.relayout();

      await rig.runs.settle(1, resultOf('k0', POSITIONS));
      await relaid;

      expect(rig.onFailure).toHaveBeenCalledExactlyOnceWith(PLACE_FAILED);
    });
  });

  it('GIVEN a placed layout and a canvas that then throws WHEN its key is shown again from memory THEN the failure is reported', async () => {
    await land('k0');
    rig.view.tasks.show.mockImplementation(throwPlace);

    await layout.show(requestOf('k0'));

    expect(rig.onFailure).toHaveBeenCalledExactlyOnceWith(PLACE_FAILED);
  });

  it('GIVEN a run in flight WHEN another key is asked for and the first run fails THEN nothing is reported and the second stays asked for', async () => {
    const first = layout.show(requestOf('k0'));

    void layout.show(requestOf('k1'));
    await rig.runs.fail(0, PLACE_FAILED);
    await first;

    expect(rig.onFailure).not.toHaveBeenCalled();
    expect(layout.key()).toBe('k1');
  });
});
