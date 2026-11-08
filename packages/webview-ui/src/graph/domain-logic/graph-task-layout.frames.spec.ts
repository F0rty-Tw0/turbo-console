import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskLayout } from './graph-task-layout.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskLayoutRequest } from '../common/graph-task.type.ts';
import type { BoxFrame, BoxFrames, LayoutResult } from '../common/layout.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { NAMING_STUB, TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';

const API_AT: Position = { x: 10, y: 20 };

const POSITIONS: Positions = { 'api#build': API_AT };

const FRAME: BoxFrame = { leafId: 'api#build', left: -75, right: 75, top: -57, bottom: 63, titleX: -35, titleY: -49 };

const FRAMES: BoxFrames = { 'pkg:api': FRAME };

const requestOf = (key: string): TaskLayoutRequest => {
  const request: TaskLayoutRequest = {
    tasks: TASK_CHAIN_STUB,
    shown: new Set(['api#build']),
    key,
    sizes: new Map(),
    naming: NAMING_STUB
  };

  return request;
};

describe('FEATURE: box frames through the task layout', () => {
  let rig: TaskModeRig;
  let layout: GraphTaskLayout;

  /** Shows `key` and lands it with the frames of `FRAMES`. */
  const landFramed = async (key: string): Promise<void> => {
    const shown = layout.show(requestOf(key));
    const landed = resultOf(key, POSITIONS);
    const framed: LayoutResult = { ...landed, boxFrames: FRAMES };

    await rig.runs.settle(rig.runs.count() - 1, framed);
    await shown;
  };

  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };
    const modes = new ViewStateModes(saver, taskSavedOf({}));

    rig = taskModeRigOf(modes);

    const { deps } = rig;

    layout = new GraphTaskLayout({
      ...deps,
      saved: (): null => null,
      rootLabel: (): null => null,
      onPlaced: vi.fn(),
      onDrawn: vi.fn()
    });
  });

  describe('GIVEN a layout whose result holds the frame of pkg:api', () => {
    it('WHEN it lands THEN the canvas draws with those frames', async () => {
      await landFramed('k0');

      expect(rig.view.tasks.show).toHaveBeenCalledWith(expect.objectContaining({ boxFrames: FRAMES }));
    });

    it('WHEN another key lands and the first is shown again from memory THEN the canvas draws with the same frames', async () => {
      await landFramed('k0');
      await landFramed('k1');
      await layout.show(requestOf('k0'));

      expect(rig.runs.count()).toBe(2);
      expect(rig.view.tasks.show).toHaveBeenCalledTimes(3);
      expect(rig.view.tasks.show).toHaveBeenLastCalledWith(expect.objectContaining({ boxFrames: FRAMES }));
    });
  });
});
