import { expect, test } from './graph.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { CORE_TO_WEB_FACTS_STUB, WEB_TO_CORE_FOCUSED_FACTS_STUB } from './test/stubs/graph-trace-facts.stub.ts';
import { FOCUS_UI_PICKING_NODES_STUB } from './test/stubs/graph-trace-states.stub.ts';
import { NONE_INSPECTION, packageInspection, pickingInspection, traceInspection } from './test/utils/graph-inspection.spec.util.ts';
import type { GraphTraceRef, GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const RF3 = { description: 'M4-3 Review Focus 3', type: 'requirement' };

const SWAPPED_TRACE: GraphTraceRef = { start: 'core', end: 'web' };

test.describe('FEATURE: graph trace exits', () => {
  test(
    'GIVEN a trace being picked on a zoomed graph, Cancel shows the start package and leaves the camera alone',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND Cancel is pressed', async (): Promise<void> => graphTrace.cancel());

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND the panel is headed web', async (): Promise<void> => graphDetails.expectHeading('web'));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('AND the canvas hint is gone', async (): Promise<void> => graphTrace.expectHint(null));

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN a trace being picked with focus in the panel, Escape shows the start package and keeps it selected',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('AND web is the selected package', async (): Promise<void> => graphProbe.expectSelected('web'));

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN the graph focused, Escape ends a picking at the start package and anything else at nothing',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND the graph is focused', async (): Promise<void> => graphPage.focusContainer());

      await test.step('AND Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('WHEN core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND the graph is focused', async (): Promise<void> => graphPage.focusContainer());

      await test.step('AND Escape is pressed', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NONE_INSPECTION));

      await test.step('AND the status line is empty', async (): Promise<void> => graphPage.expectStatus(''));

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());

      await test.step('WHEN web is picked in the list', async (): Promise<void> => graphList.pick('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND the graph is focused', async (): Promise<void> => graphPage.focusContainer());

      await test.step('AND Escape is pressed on the trace', async (): Promise<void> => graphPage.pressKey('Escape'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NONE_INSPECTION));

      await test.step('AND the status line is empty', async (): Promise<void> => graphPage.expectStatus(''));

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN a trace, Clear trace shows the start package and focuses its heading',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('THEN the trace runs from web to core', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'core')));

      await test.step('WHEN the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND Clear trace is pressed', async (): Promise<void> => graphTrace.clearTrace());

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND the panel is headed web', async (): Promise<void> => graphDetails.expectHeading('web'));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN a trace being picked, the background tap and Clear selection each end at nothing',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphLink, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('THEN web is still being picked from, nudged', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web', true)));

      await test.step('WHEN the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND the background is tapped', async (): Promise<void> => graphCanvas.tapBackground());

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NONE_INSPECTION));

      await test.step('AND the panel is empty', async (): Promise<void> => graphDetails.expectEmpty());

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());

      await test.step('WHEN web is picked in the list', async (): Promise<void> => graphList.pick('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND Clear selection is pressed', async (): Promise<void> => graphPage.pressButton('Clear selection'));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NONE_INSPECTION));

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN a trace being picked, Focus in the list narrows the candidates without making a trace',
    { annotation: RF3 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage, graphProbe, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND ui is focused in the list', async (): Promise<void> => graphList.focusOn('ui'));

      await test.step('THEN web is still being picked from', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));

      await test.step('AND the picking view is shown', async (): Promise<void> => graphTrace.expectPicking('web'));

      await test.step('AND the focus filter is applied', async (): Promise<void> =>
        graphCamera.expectVisible(['ui', 'core', 'web', 'admin']));

      await test.step('AND the candidates are those still shown', async (): Promise<void> =>
        graphTrace.expectCandidates('forward', ['ui', 'core'], 2));

      await test.step('AND only they are lit', async (): Promise<void> => graphProbe.expectNodeStates(FOCUS_UI_PICKING_NODES_STUB));

      await test.step('WHEN core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('THEN the trace runs through data, which the focus hides and Show cannot bring back', async (): Promise<void> =>
        graphTrace.expectTrace(WEB_TO_CORE_FOCUSED_FACTS_STUB));
    }
  );

  test(
    'GIVEN a trace, Swap ends turns it around in place, keeps the camera and saves the new start',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND core is picked in the list', async (): Promise<void> => graphList.pick('core'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND Swap ends is pressed', async (): Promise<void> => graphTrace.swapEnds());

      await test.step('THEN the trace view is titled core to web and says web depends on core', async (): Promise<void> =>
        graphTrace.expectTrace(CORE_TO_WEB_FACTS_STUB));

      await test.step('AND the status reads core to web', async (): Promise<void> =>
        graphPage.expectStatus('Trace core → web: 3 packages'));

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());

      await test.step('AND the trace runs from core to web', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('core', 'web')));

      const carried = await test.step('WHEN the page is reopened', async (): Promise<GraphViewState> => graphHost.reopen());

      await test.step('THEN the saved trace runs from core to web', (): void => expect(carried.trace).toEqual(SWAPPED_TRACE));

      await test.step('AND core is the saved selection', (): void => expect(carried.selected).toBe('core'));
    }
  );
});
