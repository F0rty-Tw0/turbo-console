import { DOCKED_CANVAS_PX, DOCKED_WIDTH_PX, OVERLAY_CANVAS_PX, OVERLAY_WIDTH_PX } from './common/graph.const.ts';
import { test } from './graph.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';

const C8 = { description: 'M4-3 C8', type: 'requirement' };

test.describe('FEATURE: graph camera in a narrow editor', () => {
  test(
    'GIVEN a moved camera and no inspection, crossing 960 px in both directions keeps zoom and pan',
    { annotation: C8 },
    async ({ graphCamera, graphCanvas, graphHost, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is set to 960 px', async (): Promise<void> => graphNarrow.setWidth(DOCKED_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the canvas is zoomed out', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the canvas is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('THEN the canvas follows the new width', async (): Promise<void> =>
        graphCamera.expectContainerWidth(OVERLAY_CANVAS_PX));

      await test.step('AND the camera is unchanged', async (): Promise<void> => graphCamera.expectCameraUnchanged());

      await test.step('WHEN the editor is widened to 960 px', async (): Promise<void> => graphNarrow.setWidth(DOCKED_WIDTH_PX));

      await test.step('THEN the canvas follows the new width', async (): Promise<void> =>
        graphCamera.expectContainerWidth(DOCKED_CANVAS_PX));

      await test.step('AND the camera is unchanged', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN a closed overlay, opening the panel or tapping a package at the right edge pans it clear of the overlay',
    { annotation: C8 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphNarrow, graphPage, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the Details toggle is pressed', async (): Promise<void> => graphDetails.toggle());

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND docs is tapped', async (): Promise<void> => graphCanvas.tapNode('docs'));

      await test.step('WHEN the Details toggle is pressed again', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the camera moved', async (): Promise<void> => graphCamera.expectCameraMoved());

      await test.step('AND the keep-clear pan left the view fitted', async (): Promise<void> =>
        graphTaskHost.expectStillSaved({ fitted: true }));

      await test.step('AND docs is clear of the overlay', async (): Promise<void> => graphNarrow.expectAnchorsClear(['docs']));

      await test.step('AND the zoom is unchanged', async (): Promise<void> => graphCamera.expectZoomUnchanged());

      await test.step('WHEN the canvas is panned so docs sits in the overlay margin', async (): Promise<void> =>
        graphCanvas.panBy(10, 0));

      await test.step('AND docs is tapped again', async (): Promise<void> => graphCanvas.tapNode('docs'));

      await test.step('THEN docs is clear of the overlay again', async (): Promise<void> => graphNarrow.expectAnchorsClear(['docs']));

      await test.step('WHEN the canvas is panned so docs sits in the overlay margin again', async (): Promise<void> =>
        graphCanvas.panBy(10, 0));

      await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND focus is put on the Exclude button', async (): Promise<void> => graphDetails.focusButton('Exclude'));

      await test.step('AND Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

      await test.step('THEN the camera is unchanged', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN a docked panel, tapping a package at the right edge does not move the camera',
    { annotation: C8 },
    async ({ graphCamera, graphCanvas, graphHost, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is set to 960 px', async (): Promise<void> => graphNarrow.setWidth(DOCKED_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the canvas is panned so docs sits against the right edge', async (): Promise<void> =>
        graphCanvas.panBy(20, 0));

      await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND docs is tapped', async (): Promise<void> => graphCanvas.tapNode('docs'));

      await test.step('THEN the camera is unchanged', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );
});
