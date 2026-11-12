import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskLayout } from './graph-task-layout.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { EdgeRoute, Position, Positions, Routes } from '../../bridge/common/graph-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskLayoutRequest } from '../common/graph-task.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { NAMING_STUB, TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';

const APP_AT: Position = { x: 0, y: 0 };

const LIB_AT: Position = { x: 0, y: 100 };

const UI_AT: Position = { x: 0, y: 200 };

const POSITIONS: Positions = { 'app#build': APP_AT, 'lib#build': LIB_AT, 'ui#build': UI_AT };

const UI_DRAGGED_AT: Position = { x: 300, y: 200 };

const DRAGGED_AT: Positions = { ...POSITIONS, 'ui#build': UI_DRAGGED_AT };

const APP_LIB = 'app#build>lib#build';

const APP_LIB_BENDS: Position[] = [{ x: 20, y: 50 }];

const APP_LIB_ROUTE: EdgeRoute = { start: APP_AT, bends: APP_LIB_BENDS, end: LIB_AT };

const ROUTES: Routes = { [APP_LIB]: APP_LIB_ROUTE };

const requestOf = (key: string): TaskLayoutRequest => {
  const request: TaskLayoutRequest = {
    tasks: TASK_CHAIN_STUB,
    shown: new Set(['app#build']),
    key,
    sizes: new Map(),
    naming: NAMING_STUB
  };

  return request;
};

/** The runner's result for `key`: ELK still routes its links, which task mode never draws. */
const routedOf = (key: string): LayoutResult => {
  const plain = resultOf(key, POSITIONS);
  const routed: LayoutResult = { ...plain, routes: ROUTES };

  return routed;
};

describe('FEATURE: GraphTaskLayout draws its links straight', () => {
  let rig: TaskModeRig;
  let layout: GraphTaskLayout;

  /** Shows `key` and lands it as the latest run, routed. */
  const landRouted = async (key: string): Promise<void> => {
    const shown = layout.show(requestOf(key));

    await rig.runs.settle(rig.runs.count() - 1, routedOf(key));
    await shown;
  };

  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    rig = taskModeRigOf(new ViewStateModes(saver, taskSavedOf({})));
    layout = new GraphTaskLayout({
      ...rig.deps,
      saved: (): null => null,
      rootLabel: (): null => null,
      onPlaced: vi.fn(),
      onDrawn: vi.fn()
    });
    rig.view.tasks.positions.mockReturnValue(DRAGGED_AT);
  });

  describe('GIVEN a task layout whose run came back with routes', () => {
    it('WHEN placed THEN show gets no routes', async () => {
      await landRouted('k0');

      expect(rig.view.tasks.show.mock.lastCall?.[0]).not.toHaveProperty('routes');
    });
  });

  describe('GIVEN the layout on screen', () => {
    beforeEach(async () => {
      await landRouted('k0');
    });

    it('WHEN dragged and the same layout key is placed again from memory THEN show gets the dragged centres', async () => {
      layout.dragged();
      rig.view.tasks.show.mockClear();

      await layout.show(requestOf('k0'));

      expect(rig.runs.count()).toBe(1);
      expect(rig.view.tasks.show).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ positions: DRAGGED_AT }));
    });

    it('WHEN dragged THEN nothing is posted', () => {
      layout.dragged();

      const positionPosts = rig.posts().filter((message): boolean => message.type === 'positions');

      expect(positionPosts).toStrictEqual([]);
    });
  });
});
