import { OVERLAY_WIDTH_PX } from './common/graph.const.ts';
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

const LONG_WEB = '@company/web';

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

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
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

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
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

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
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

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
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

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
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

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
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

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
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

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
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

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN task mode and a fitted task camera, shrinking the page re-fits it and saves it fitted',
    { annotation: T3 },
    async ({ graphCamera, graphCanvas, graphHost, graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens cold in task mode with app#build chosen', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphTaskProbe.expectTaskIds(CHAIN);
      });

      await test.step('AND the task camera is saved fitted and remembered', async (): Promise<void> => {
        await graphTaskHost.expectSavedTask({ fitted: true });
        await graphCamera.rememberCamera();
      });

      await test.step('AND the page is made shorter', async (): Promise<void> => graphCamera.shrinkHeightBy(SHRINK_PX));

      await test.step('THEN the camera moved and every node is in view', async (): Promise<void> => {
        await graphCamera.expectCameraMoved();
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('AND the task camera is saved fitted', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ fitted: true }));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN a narrow editor with the Details overlay open and docs selected, shrinking the page re-fits and keeps docs clear',
    { annotation: T3 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphNarrow, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px and the details graph is sent', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphNarrow.expectOverlay();
      });

      await test.step('AND the overlay is closed, docs is tapped and the overlay is opened again', async (): Promise<void> => {
        await graphDetails.toggle();
        await graphCanvas.tapNode('docs');
        await graphDetails.toggle();
      });

      await test.step('AND docs is clear of the overlay and the view is saved fitted', async (): Promise<void> => {
        await graphNarrow.expectAnchorsClear(['docs']);
        await graphTaskHost.expectSaved({ fitted: true });
      });

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND the page is made shorter', async (): Promise<void> => graphCamera.shrinkHeightBy(SHRINK_PX));

      await test.step('THEN the camera moved and docs is clear of the overlay', async (): Promise<void> => {
        await graphCamera.expectCameraMoved();
        await graphNarrow.expectAnchorsClear(['docs']);
      });

      await test.step('AND the view is saved fitted', async (): Promise<void> => graphTaskHost.expectSaved({ fitted: true }));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN a narrow editor and a two-package graph fitted at the maximum zoom and panned clear of the Details overlay, a wheel-in notch keeps it fitted and a shrink re-fits it',
    { annotation: T3 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphNarrow, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px and the two-package graph is sent', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphPage.open();
        await graphHost.sendState(TASK_LONG_NAMES_STUB);
        await graphNarrow.expectOverlay();
        await graphTaskHost.expectSaved({ fitted: true });
      });

      await test.step('AND the camera is remembered, the overlay closed, web tapped and the overlay opened again', async (): Promise<void> => {
        await graphCamera.rememberCamera();
        await graphDetails.toggle();
        await graphCanvas.tapNode(LONG_WEB);
        await graphDetails.toggle();
      });

      await test.step('THEN the camera moved, web is clear of the overlay and the view is saved fitted', async (): Promise<void> => {
        await graphCamera.expectCameraMoved();
        await graphNarrow.expectAnchorsClear([LONG_WEB]);
        await graphTaskHost.expectStillSaved({ fitted: true });
      });

      await test.step('WHEN the camera is remembered and the wheel turns in one notch', async (): Promise<void> => {
        await graphCamera.rememberCamera();
        await graphCanvas.zoomBy(-100);
        await graphPage.waitFrames();
      });

      await test.step('THEN the clamped zoom left the camera unchanged and the view saved fitted', async (): Promise<void> => {
        await graphCamera.expectCameraUnchanged();
        await graphTaskHost.expectStillSaved({ fitted: true });
      });

      await test.step('WHEN the page is made shorter', async (): Promise<void> => graphCamera.shrinkHeightBy(SHRINK_PX));

      await test.step('THEN the camera moved and web is clear of the overlay', async (): Promise<void> => {
        await graphCamera.expectCameraMoved();
        await graphNarrow.expectAnchorsClear([LONG_WEB]);
      });

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );
});
