import { mergeTests } from '@playwright/test';

import { test as routesTest } from './graph-routes.fixture.ts';
import { test as taskTest } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import { RELAYOUT_LABEL } from '../src/graph/common/graph.const.ts';
import { edgeIdOf } from '../src/graph/utils/edge-id.util.ts';

const test = mergeTests(taskTest, routesTest);

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

const SAVED_TASK_VIEW = taskSavedState('7a5c0001', { chosen: ['app#build'] });

const LINK_COUNT = 2;

/** `lib#build` needs `ui#build`: the one link of the chain that `ui#build` ends. */
const LIB_UI = edgeIdOf({ source: 'lib#build', target: 'ui#build' });

test.describe('FEATURE: task links drawn on their routes', () => {
  test('GIVEN the chain drawn, both links are routed', async ({
    graphHost,
    graphPage,
    graphRoutes,
    graphTaskProbe
  }): Promise<void> => {
    await test.step('WHEN the page opens with app#build chosen and the task state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: SAVED_TASK_VIEW });
      await graphHost.sendState(TASK_MODE_STATE_STUB);
    });

    await test.step('AND the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

    await test.step('THEN both links are routed with at least 3 points', async (): Promise<void> =>
      graphRoutes.expectEveryLineRouted(LINK_COUNT));
  });

  test('GIVEN the chain drawn, dragging ui#build straightens lib#build to ui#build only, and Packages then Tasks keeps that', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphRoutes,
    graphTask,
    graphTaskProbe
  }): Promise<void> => {
    await test.step('WHEN the page opens with app#build chosen and the task state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: SAVED_TASK_VIEW });
      await graphHost.sendState(TASK_MODE_STATE_STUB);
    });

    await test.step('AND the chain is drawn with both links routed', async (): Promise<void> => {
      await graphTaskProbe.expectTaskIds(CHAIN);
      await graphRoutes.expectEveryLineRouted(LINK_COUNT);
    });

    await test.step('AND ui#build is dragged by 60 px right and 40 px down', async (): Promise<void> =>
      graphCanvas.dragNode('ui#build', 60, 40));

    await test.step('THEN lib#build to ui#build is straight and app#build to lib#build routed (b5 task)', async (): Promise<void> =>
      graphRoutes.expectRoutedExcept([LIB_UI]));

    await test.step('AND no positions were posted', async (): Promise<void> => graphHost.expectNoPositionsPosted());

    await test.step('WHEN Packages and then Tasks are pressed', async (): Promise<void> => {
      await graphTask.leave();
      await graphTask.expectPressed(false);
      await graphTask.enter();
      await graphTask.expectPressed(true);
      await graphTaskProbe.expectTaskIds(CHAIN);
    });

    await test.step('THEN the split is kept: lib#build to ui#build straight, the other link routed', async (): Promise<void> =>
      graphRoutes.expectRoutedExcept([LIB_UI]));

    await test.step('WHEN Re-layout is pressed', async (): Promise<void> => graphPage.pressButton(RELAYOUT_LABEL));

    await test.step('THEN both links are routed again', async (): Promise<void> => graphRoutes.expectEveryLineRouted(LINK_COUNT));
  });
});
