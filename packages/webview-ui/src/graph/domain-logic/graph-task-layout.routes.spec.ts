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

const LIB_UI = 'lib#build>ui#build';

const APP_LIB_BENDS: Position[] = [{ x: 20, y: 50 }];

const LIB_UI_BENDS: Position[] = [{ x: 20, y: 150 }];

const APP_LIB_ROUTE: EdgeRoute = { start: APP_AT, bends: APP_LIB_BENDS, end: LIB_AT };

const LIB_UI_ROUTE: EdgeRoute = { start: LIB_AT, bends: LIB_UI_BENDS, end: UI_AT };

const ROUTES: Routes = { [APP_LIB]: APP_LIB_ROUTE, [LIB_UI]: LIB_UI_ROUTE };

const APP_LIB_ONLY: Routes = { [APP_LIB]: APP_LIB_ROUTE };

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

const routedOf = (key: string): LayoutResult => {
  const plain = resultOf(key, POSITIONS);
  const routed: LayoutResult = { ...plain, routes: ROUTES };

  return routed;
};

describe('FEATURE: GraphTaskLayout routes', () => {
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

  describe('GIVEN a task layout with routes', () => {
    it('WHEN placed THEN show gets those routes', async () => {
      await landRouted('k0');

      expect(rig.view.tasks.show).toHaveBeenCalledWith(expect.objectContaining({ routes: ROUTES }));
    });
  });

  describe('GIVEN routes app>lib and lib>ui on screen', () => {
    beforeEach(async () => {
      await landRouted('k0');
    });

    it('WHEN dragged with touched [lib>ui] THEN setRoutes gets app>lib only', () => {
      layout.dragged([LIB_UI]);

      expect(rig.view.tasks.setRoutes).toHaveBeenCalledExactlyOnceWith(APP_LIB_ONLY);
    });

    it('WHEN dragged and the same layout key is placed again from memory THEN lib>ui stays straight', async () => {
      layout.dragged([LIB_UI]);
      rig.view.tasks.show.mockClear();

      await layout.show(requestOf('k0'));

      expect(rig.runs.count()).toBe(1);
      expect(rig.view.tasks.show).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ routes: APP_LIB_ONLY }));
    });

    it('WHEN dragged and Re-layout lands THEN show gets every route', async () => {
      layout.dragged([LIB_UI]);
      rig.view.tasks.show.mockClear();

      const relaid = layout.relayout();

      await rig.runs.settle(1, routedOf('k0'));
      await relaid;

      expect(rig.view.tasks.show).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ routes: ROUTES }));
    });

    it('WHEN dragged THEN nothing is posted', () => {
      layout.dragged([LIB_UI]);

      const positionPosts = rig.posts().filter((message): boolean => message.type === 'positions');

      expect(positionPosts).toStrictEqual([]);
    });
  });
});
