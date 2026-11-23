import type { MockInstance } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskLayout } from './graph-task-layout.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskLayoutRequest } from '../common/graph-task.type.ts';
import type { LayoutRunner } from '../common/layout.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { NAMING_STUB, TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';

const API_AT: Position = { x: 10, y: 20 };

const POSITIONS: Positions = { 'api#build': API_AT };

const REQUEST: TaskLayoutRequest = {
  tasks: TASK_CHAIN_STUB,
  shown: new Set(['api#build']),
  key: 'k0',
  sizes: new Map(),
  naming: NAMING_STUB
};

describe('FEATURE: GraphTaskLayout forced runs', () => {
  let rig: TaskModeRig;
  let layout: GraphTaskLayout;
  let run: MockInstance<LayoutRunner['run']>;

  beforeEach((): void => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({})));
    run = vi.spyOn(rig.runs.runner, 'run');
    layout = new GraphTaskLayout({
      ...rig.deps,
      saved: (): null => null,
      rootLabel: (): null => null,
      onPlaced: vi.fn(),
      onDrawn: vi.fn()
    });
  });

  describe('GIVEN a key shown and laid out', () => {
    beforeEach(async (): Promise<void> => {
      const shown = layout.show(REQUEST);

      await rig.runs.settle(0, resultOf('k0', POSITIONS));
      await shown;
    });

    it('THEN its first run is not forced', () => {
      expect(run).toHaveBeenLastCalledWith('k0', expect.anything(), false);
    });

    it('WHEN Re-layout or Retry is asked THEN its run is forced', () => {
      void layout.relayout();

      expect(run).toHaveBeenLastCalledWith('k0', expect.anything(), true);
    });
  });
});
