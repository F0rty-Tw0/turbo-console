import { DOCKED_CANVAS_PX, DOCKED_WIDTH_PX, OVERLAY_CANVAS_PX, OVERLAY_WIDTH_PX } from './common/graph.const.ts';
import { test } from './graph.fixture.ts';
import { LONG_NAME_STUB, LONG_PATH_STUB, UNBROKEN_NAME_STUB, UNBROKEN_PATH_STUB } from './test/stubs/graph-details-edge.stub.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { linkInspection, packageInspection } from './test/utils/graph-inspection.spec.util.ts';

const C8 = { description: 'M4-3 C8', type: 'requirement' };

test.describe('FEATURE: graph details panel in a narrow editor', () => {
  test(
    'GIVEN an editor 959 px wide, the details panel overlays the canvas with a Close details button',
    { annotation: C8 },
    async ({ graphCamera, graphHost, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the panel overlays the canvas', async (): Promise<void> => graphNarrow.expectOverlay());

      await test.step('AND the panel shows Close details', async (): Promise<void> => graphNarrow.expectCloseButton(true));

      await test.step('AND the overlay takes no canvas width', async (): Promise<void> =>
        graphCamera.expectContainerWidth(OVERLAY_CANVAS_PX));
    }
  );

  test(
    'GIVEN an editor 960 px wide, the details panel docks beside the canvas with no Close details button',
    { annotation: C8 },
    async ({ graphCamera, graphHost, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is set to 960 px', async (): Promise<void> => graphNarrow.setWidth(DOCKED_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the panel is docked', async (): Promise<void> => graphNarrow.expectDocked());

      await test.step('AND the panel shows no Close details', async (): Promise<void> => graphNarrow.expectCloseButton(false));

      await test.step('AND the panel takes its width off the canvas', async (): Promise<void> =>
        graphCamera.expectContainerWidth(DOCKED_CANVAS_PX));
    }
  );

  test(
    'GIVEN an overlay, the toggle and the close button drive one open state and neither resizes the canvas',
    { annotation: C8 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphKeys, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the canvas is zoomed out', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('WHEN the Details toggle is pressed', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the panel is closed', async (): Promise<void> => graphDetails.expectOpen(false));

      await test.step('AND the toggle reads collapsed', async (): Promise<void> => graphDetails.expectExpanded(false));

      await test.step('AND the canvas keeps its width', async (): Promise<void> =>
        graphCamera.expectContainerWidth(OVERLAY_CANVAS_PX));

      await test.step('AND the camera is unchanged', async (): Promise<void> => graphCamera.expectCameraUnchanged());

      await test.step('WHEN the Details toggle is pressed again', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the panel is open', async (): Promise<void> => graphDetails.expectOpen(true));

      await test.step('AND the toggle reads expanded', async (): Promise<void> => graphDetails.expectExpanded(true));

      await test.step('AND the canvas keeps its width', async (): Promise<void> =>
        graphCamera.expectContainerWidth(OVERLAY_CANVAS_PX));

      await test.step('AND the camera is unchanged', async (): Promise<void> => graphCamera.expectCameraUnchanged());

      await test.step('WHEN Close details is pressed', async (): Promise<void> => graphNarrow.closeDetails());

      await test.step('THEN the panel is closed', async (): Promise<void> => graphDetails.expectOpen(false));

      await test.step('AND the toggle reads collapsed', async (): Promise<void> => graphDetails.expectExpanded(false));

      await test.step('AND focus is on the Details toggle', async (): Promise<void> => graphKeys.expectFocusedName('Details'));

      await test.step('AND the canvas keeps its width', async (): Promise<void> =>
        graphCamera.expectContainerWidth(OVERLAY_CANVAS_PX));

      await test.step('AND the camera is unchanged', async (): Promise<void> => graphCamera.expectCameraUnchanged());

      await test.step('WHEN the Details toggle is pressed once more', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the panel is open', async (): Promise<void> => graphDetails.expectOpen(true));

      await test.step('AND the toggle reads expanded', async (): Promise<void> => graphDetails.expectExpanded(true));

      await test.step('AND the canvas keeps its width', async (): Promise<void> =>
        graphCamera.expectContainerWidth(OVERLAY_CANVAS_PX));

      await test.step('AND the camera is unchanged', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN an inspected package, crossing 960 px switches the layout and keeps the inspection',
    { annotation: C8 },
    async ({ graphCanvas, graphDetails, graphHost, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('WHEN the editor is widened to 960 px', async (): Promise<void> => graphNarrow.setWidth(DOCKED_WIDTH_PX));

      await test.step('THEN the panel is docked', async (): Promise<void> => graphNarrow.expectDocked());

      await test.step('AND the panel shows no Close details', async (): Promise<void> => graphNarrow.expectCloseButton(false));

      await test.step('AND web is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN the editor is narrowed to 959 px again', async (): Promise<void> =>
        graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('THEN the panel overlays the canvas', async (): Promise<void> => graphNarrow.expectOverlay());

      await test.step('AND the panel shows Close details', async (): Promise<void> => graphNarrow.expectCloseButton(true));

      await test.step('AND web is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(packageInspection('web')));
    }
  );

  test(
    'GIVEN focus on Close details, widening the editor to 960 px moves focus to the Details toggle',
    { annotation: C8 },
    async ({ graphDetails, graphHost, graphKeys, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND focus is put on Close details', async (): Promise<void> => graphDetails.focusButton('Close details'));

      await test.step('AND the editor is widened to 960 px', async (): Promise<void> => graphNarrow.setWidth(DOCKED_WIDTH_PX));

      await test.step('THEN focus is on the Details toggle', async (): Promise<void> => graphKeys.expectFocusedName('Details'));

      await test.step('AND the panel is still open', async (): Promise<void> => graphDetails.expectOpen(true));
    }
  );

  test(
    'GIVEN an overlay, Escape in the panel never closes it and a long package keeps it 280 px wide',
    { annotation: C8 },
    async ({ graphCanvas, graphDetails, graphHost, graphList, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND focus is put on the Package Details button', async (): Promise<void> =>
        graphDetails.focusButton('View Package Details · 5 tasks'));

      await test.step('WHEN Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN the panel is still open', async (): Promise<void> => graphDetails.expectOpen(true));

      await test.step('AND web is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN the long path graph is sent', async (): Promise<void> => graphHost.sendState(LONG_PATH_STUB));

      await test.step('AND the long package is picked in the list', async (): Promise<void> => graphList.pick(LONG_NAME_STUB));

      await test.step('THEN the page does not scroll sideways', async (): Promise<void> => graphNarrow.expectNoHorizontalScroll());

      await test.step('WHEN the editor is widened to 960 px', async (): Promise<void> => graphNarrow.setWidth(DOCKED_WIDTH_PX));

      await test.step('THEN the page does not scroll sideways', async (): Promise<void> => graphNarrow.expectNoHorizontalScroll());
    }
  );

  test(
    'GIVEN a package whose name, path and tag cannot break, the overlay and the docked panel keep 280 px and do not scroll sideways',
    { annotation: C8 },
    async ({ graphHost, graphList, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the unbroken graph is sent', async (): Promise<void> => graphHost.sendState(UNBROKEN_PATH_STUB));

      await test.step('AND the unbroken package is picked in the list', async (): Promise<void> => graphList.pick(UNBROKEN_NAME_STUB));

      await test.step('THEN the overlay does not scroll sideways', async (): Promise<void> => graphNarrow.expectNoHorizontalScroll());

      await test.step('WHEN the editor is widened to 960 px', async (): Promise<void> => graphNarrow.setWidth(DOCKED_WIDTH_PX));

      await test.step('THEN the docked panel does not scroll sideways', async (): Promise<void> =>
        graphNarrow.expectNoHorizontalScroll());
    }
  );

  test(
    'GIVEN an overlay, every details view has a Close details button and the docked panel has none',
    { annotation: C8 },
    async ({ graphCanvas, graphDetails, graphHost, graphLink, graphList, graphNarrow, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('THEN the package view has Close details', async (): Promise<void> => graphNarrow.expectCloseButton(true));

      await test.step('WHEN the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('THEN the link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'ui')));

      await test.step('AND the link view has Close details', async (): Promise<void> => graphNarrow.expectCloseButton(true));

      await test.step('WHEN web is tapped again', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('THEN the picking view has Close details', async (): Promise<void> => graphNarrow.expectCloseButton(true));

      await test.step('WHEN config is picked in the list', async (): Promise<void> => graphList.pick('config'));

      await test.step('THEN the trace view has Close details', async (): Promise<void> => graphNarrow.expectCloseButton(true));

      await test.step('WHEN the editor is widened to 960 px', async (): Promise<void> => graphNarrow.setWidth(DOCKED_WIDTH_PX));

      await test.step('THEN the trace view has no Close details', async (): Promise<void> => graphNarrow.expectCloseButton(false));

      await test.step('WHEN the trace is cleared', async (): Promise<void> => graphTrace.clearTrace());

      await test.step('THEN the rebuilt package view has no Close details', async (): Promise<void> =>
        graphNarrow.expectCloseButton(false));

      await test.step('WHEN Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('THEN the rebuilt picking view has no Close details', async (): Promise<void> =>
        graphNarrow.expectCloseButton(false));

      await test.step('WHEN config is picked in the list', async (): Promise<void> => graphList.pick('config'));

      await test.step('THEN the rebuilt trace view has no Close details', async (): Promise<void> =>
        graphNarrow.expectCloseButton(false));

      await test.step('WHEN the trace is cleared again', async (): Promise<void> => graphTrace.clearTrace());

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('THEN the link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'ui')));

      await test.step('AND the rebuilt link view has no Close details', async (): Promise<void> =>
        graphNarrow.expectCloseButton(false));
    }
  );
});
