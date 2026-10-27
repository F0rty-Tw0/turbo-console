import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { packageInspection } from './test/utils/graph-inspection.spec.util.ts';
import { NO_INSPECTION } from '../src/graph/common/inspection.const.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const UI_FOCUSED = ['ui', 'core', 'web', 'admin'];

test.describe('FEATURE: graph inspection transitions', () => {
  test(
    'GIVEN a tapped link, a node tap, a list pick and a panel button each swap to the package they name',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphLink, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND core is tapped on the canvas', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('THEN core is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('core')));

      await test.step('WHEN ui is picked in the list', async (): Promise<void> => graphList.pick('ui'));

      await test.step('THEN ui is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('ui')));

      await test.step('AND ui is centred', async (): Promise<void> => graphCamera.expectCentred('ui'));

      await test.step('WHEN the core neighbour is pressed in the panel', async (): Promise<void> =>
        graphDetails.pressNeighbour('core'));

      await test.step('THEN core is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('core')));

      await test.step('AND core is centred', async (): Promise<void> => graphCamera.expectCentred('core'));

      await test.step('AND core is the current row', async (): Promise<void> => graphList.expectRowCurrent('core'));
    }
  );

  test(
    'GIVEN a tapped link, an end button inspects that end, centres it and focuses the heading without zooming',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphLink, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the ui end is pressed', async (): Promise<void> => graphLink.pressEnd('ui'));

      await test.step('THEN ui is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('ui')));

      await test.step('AND ui is centred', async (): Promise<void> => graphCamera.expectCentred('ui'));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('WHEN the web to ui link is tapped again', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the web end is pressed', async (): Promise<void> => graphLink.pressEnd('web'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND web is centred', async (): Promise<void> => graphCamera.expectCentred('web'));

      await test.step('AND the zoom is as before', async (): Promise<void> => graphCamera.expectZoomUnchanged());
    }
  );

  test(
    'GIVEN a tapped link or package, the background, Escape and Clear selection each empty the panel',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphDetailsBar, graphHost, graphLink, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the background is tapped', async (): Promise<void> => graphCanvas.tapBackground());

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('WHEN the web to ui link is tapped again', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the container is focused', async (): Promise<void> => graphPage.focusContainer());

      await test.step('AND Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('WHEN core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND Clear selection is pressed', async (): Promise<void> => graphDetailsBar.pressClear());

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('AND the panel is empty', async (): Promise<void> => graphDetails.expectEmpty());

      await test.step('AND the Details bar is hidden and Clear selection disabled', async (): Promise<void> =>
        graphDetailsBar.expectClearHidden());

      await test.step('AND the status line is empty', async (): Promise<void> => graphPage.expectStatus(''));
    }
  );

  test(
    'GIVEN a link and a package, Enter on the graph opens package details only for the package',
    { annotation: AC1 },
    async ({ graphHost, graphLink, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the container is focused', async (): Promise<void> => graphPage.focusContainer());

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the host got no openDetails', async (): Promise<void> => graphHost.expectNoOpenDetails());

      await test.step('WHEN core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('AND the container is focused', async (): Promise<void> => graphPage.focusContainer());

      await test.step('AND Enter is pressed', async (): Promise<void> => graphPage.pressKey('Enter'));

      await test.step('THEN the host got one openDetails for core', async (): Promise<void> => graphHost.expectOpenDetails('core'));
    }
  );

  test(
    'GIVEN the details graph, focusing a package from the list inspects it',
    { annotation: AC1 },
    async ({ graphCamera, graphDetails, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND ui is focused in the list', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('THEN ui is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('ui')));

      await test.step('AND the panel is headed ui', async (): Promise<void> => graphDetails.expectHeading('ui'));

      await test.step('AND the button reads Clear focus', async (): Promise<void> => graphDetails.expectFocusLabel('Clear focus'));

      await test.step('AND ui is the current row', async (): Promise<void> => graphList.expectRowCurrent('ui'));

      await test.step('AND only ui and its neighbours are visible', async (): Promise<void> => graphCamera.expectVisible(UI_FOCUSED));
    }
  );
});
