import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { SAVED_BASE_STUB } from './test/stubs/graph-saved.stub.ts';
import { TASK_LONG_NAMES_STUB, TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const T3 = { description: 'U3 D3 T3', type: 'requirement' };

const SHRINK_PX = 220;

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

const OFF_SCREEN = { x: 900, y: 900 };

const savedAtCorner = (fitted: boolean): GraphViewState => {
  const state: GraphViewState = { ...SAVED_BASE_STUB, zoom: 4, pan: OFF_SCREEN, fitted };

  return state;
};

test.describe('FEATURE: graph camera re-fit', () => {
  test(
    'GIVEN a fitted graph, shrinking the page re-fits it and saves it fitted',
    { annotation: T3 },
    async ({ graphCamera, graphCanvas, graphHost, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('AND every node is in view and the camera is remembered', async (): Promise<void> => {
        await graphCanvas.expectAllNodesInView();
        await graphCamera.rememberCamera();
      });

      await test.step('AND the page is made shorter', async (): Promise<void> => graphCamera.shrinkHeightBy(SHRINK_PX));

      await test.step('THEN the camera moved and every node is in view', async (): Promise<void> => {
        await graphCamera.expectCameraMoved();
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('AND the view is saved fitted', async (): Promise<void> => graphTaskHost.expectSaved({ fitted: true }));
    }
  );

  test(
    'GIVEN a panned graph, shrinking the page keeps zoom and pan and saves it not fitted',
    { annotation: T3 },
    async ({ graphCamera, graphCanvas, graphHost, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('AND the canvas is zoomed, panned and the camera remembered', async (): Promise<void> => {
        await graphCanvas.zoomBy(-300);
        await graphCanvas.panBy(40, 25);
        await graphCamera.rememberCamera();
      });

      await test.step('AND the page is made shorter and two frames pass twice', async (): Promise<void> => {
        await graphCamera.shrinkHeightBy(SHRINK_PX);
        await graphPage.waitFrames();
        await graphPage.waitFrames();
      });

      await test.step('THEN the camera is unchanged and saved not fitted', async (): Promise<void> => {
        await graphCamera.expectCameraUnchanged();
        await graphTaskHost.expectSaved({ fitted: false });
      });
    }
  );

  test(
    'GIVEN a graph panned and then fitted again by Fit, the view saves fitted and a shrink re-fits it',
    { annotation: T3 },
    async ({ graphCamera, graphCanvas, graphHost, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened, the details graph is sent and the canvas is panned', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphCanvas.panBy(40, 25);
        await graphTaskHost.expectSaved({ fitted: false });
      });

      await test.step('AND Fit is pressed', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

      await test.step('THEN the view is saved fitted', async (): Promise<void> => graphTaskHost.expectSaved({ fitted: true }));

      await test.step('WHEN the camera is remembered and the page is made shorter', async (): Promise<void> => {
        await graphCamera.rememberCamera();
        await graphCamera.shrinkHeightBy(SHRINK_PX);
      });

      await test.step('THEN the camera moved', async (): Promise<void> => graphCamera.expectCameraMoved());
    }
  );

  test(
    'GIVEN a fitted graph, one wheel notch saves it not fitted',
    { annotation: T3 },
    async ({ graphCanvas, graphHost, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('AND the view is fitted and saved so', async (): Promise<void> => {
        await graphCanvas.expectAllNodesInView();
        await graphTaskHost.expectSaved({ fitted: true });
      });

      await test.step('AND the wheel turns one notch', async (): Promise<void> => graphCanvas.zoomBy(-100));

      await test.step('THEN the view is saved not fitted', async (): Promise<void> => graphTaskHost.expectSaved({ fitted: false }));
    }
  );

  test(
    'GIVEN a two-package graph fitted at the maximum zoom, a wheel-in notch moves nothing and a shrink still re-fits it',
    { annotation: T3 },
    async ({ graphCamera, graphCanvas, graphHost, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened and the two-package graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_LONG_NAMES_STUB);
      });

      await test.step('AND the view is fitted and saved so', async (): Promise<void> => {
        await graphCanvas.expectAllNodesInView();
        await graphTaskHost.expectSaved({ fitted: true });
      });

      await test.step('AND the camera is remembered and the wheel turns in one notch', async (): Promise<void> => {
        await graphCamera.rememberCamera();
        await graphCanvas.zoomBy(-100);
        await graphPage.waitFrames();
      });

      await test.step('THEN the clamped zoom left the camera unchanged', async (): Promise<void> =>
        graphCamera.expectCameraUnchanged());

      await test.step('WHEN the page is made shorter', async (): Promise<void> => graphCamera.shrinkHeightBy(SHRINK_PX));

      await test.step('THEN the camera moved and every node is in view', async (): Promise<void> => {
        await graphCamera.expectCameraMoved();
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('AND the view is saved fitted', async (): Promise<void> => graphTaskHost.expectSaved({ fitted: true }));
    }
  );

  test(
    'GIVEN a fitted graph, picking a package from the list centres it and saves it not fitted',
    { annotation: T3 },
    async ({ graphHost, graphList, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphTaskHost.expectSaved({ fitted: true });
      });

      await test.step('AND web is picked from the list', async (): Promise<void> => graphList.pick('web'));

      await test.step('THEN the view is saved not fitted', async (): Promise<void> => graphTaskHost.expectSaved({ fitted: false }));
    }
  );

  test(
    'GIVEN a saved camera that was fitted but aims at an empty corner, the restore fits it',
    { annotation: T3 },
    async ({ graphCanvas, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened with that save and the details graph is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: savedAtCorner(true) });
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN every node is in view', async (): Promise<void> => graphCanvas.expectAllNodesInView());
    }
  );

  test(
    'GIVEN a saved camera that was not fitted and aims at an empty corner, the restore keeps it',
    { annotation: T3 },
    async ({ graphCanvas, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened with that save and the details graph is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: savedAtCorner(false) });
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN a node is out of view', async (): Promise<void> => graphCanvas.expectNodeOutOfView());
    }
  );

  test(
    'GIVEN task mode, the camera saves fitted after the layout and not fitted after a pan',
    { annotation: T3 },
    async ({ graphCanvas, graphHost, graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens cold in task mode with app#build chosen', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphTaskProbe.expectTaskIds(CHAIN);
      });

      await test.step('THEN the task camera is saved fitted', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ fitted: true }));

      await test.step('WHEN the canvas is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('THEN the task camera is saved not fitted', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ fitted: false }));
    }
  );
});
