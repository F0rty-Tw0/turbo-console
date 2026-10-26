import { test } from './graph.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import {
  CORE_TO_WEB_FACTS_STUB,
  WEB_TO_CONFIG_FACTS_STUB,
  WEB_TO_CORE_FACTS_STUB,
  WEB_TO_SOLO_FACTS_STUB,
  WEB_TO_UI_FACTS_STUB
} from './test/stubs/graph-trace-facts.stub.ts';
import {
  DIMMED_EDGES_STUB,
  NO_PATH_NODES_STUB,
  TRACE_WEB_CORE_EDGES_STUB,
  TRACE_WEB_CORE_NODES_STUB
} from './test/stubs/graph-trace-states.stub.ts';
import { packageInspection, traceInspection } from './test/utils/graph-inspection.spec.util.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

test.describe('FEATURE: graph trace view', () => {
  test(
    'GIVEN a zoomed graph being picked from, picking the end in the list shows the steps and never pans',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND config is picked in the list', async (): Promise<void> => graphList.pick('config'));

      await test.step('THEN the trace view lists the four packages from web to config', async (): Promise<void> =>
        graphTrace.expectTrace(WEB_TO_CONFIG_FACTS_STUB));

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN a trace being picked, tapping a package on the canvas makes the trace and lights its path',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphList, graphPage, graphProbe, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND core is tapped on the canvas', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('THEN the trace runs from web to core', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'core')));

      await test.step('AND the trace view lists web, data and core', async (): Promise<void> =>
        graphTrace.expectTrace(WEB_TO_CORE_FACTS_STUB));

      await test.step('AND the status counts the packages', async (): Promise<void> =>
        graphPage.expectStatus('Trace web → core: 3 packages'));

      await test.step('AND the ends are selected and data lit', async (): Promise<void> =>
        graphProbe.expectNodeStates(TRACE_WEB_CORE_NODES_STUB));

      await test.step('AND the path edges are lit', async (): Promise<void> => graphProbe.expectEdgeStates(TRACE_WEB_CORE_EDGES_STUB));

      await test.step('AND the probe reports no selected package', async (): Promise<void> => graphProbe.expectSelected(null));

      await test.step('AND no list row is current', async (): Promise<void> => graphList.expectNoRowCurrent());
    }
  );

  test(
    'GIVEN a package that others depend on being picked from, picking a dependent traces backward with the dependent first',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND web is picked in the list', async (): Promise<void> => graphList.pick('web'));

      await test.step('THEN the trace view lists web, data and core, dependent first', async (): Promise<void> =>
        graphTrace.expectTrace(CORE_TO_WEB_FACTS_STUB));

      await test.step('AND the status reads start to end', async (): Promise<void> =>
        graphPage.expectStatus('Trace core → web: 3 packages'));

      await test.step('AND the saved trace runs from core to web', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('core', 'web')));
    }
  );

  test(
    'GIVEN a trace being picked, a direct dependency makes a two package trace',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND ui is tapped on the canvas', async (): Promise<void> => graphCanvas.tapNode('ui'));

      await test.step('THEN the trace view lists web and ui', async (): Promise<void> => graphTrace.expectTrace(WEB_TO_UI_FACTS_STUB));
    }
  );

  test(
    'GIVEN a trace being picked, a package with no path makes a trace without steps and dims the graph',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphList, graphPage, graphProbe, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND solo is picked in the list', async (): Promise<void> => graphList.pick('solo'));

      await test.step('THEN the trace view says there is no path and lists no step', async (): Promise<void> =>
        graphTrace.expectTrace(WEB_TO_SOLO_FACTS_STUB));

      await test.step('AND both ends are selected and the rest dimmed', async (): Promise<void> =>
        graphProbe.expectNodeStates(NO_PATH_NODES_STUB));

      await test.step('AND every edge is dimmed', async (): Promise<void> => graphProbe.expectEdgeStates(DIMMED_EDGES_STUB));

      await test.step('AND the status says there is no path', async (): Promise<void> =>
        graphPage.expectStatus('No dependency path between web and solo'));
    }
  );

  test(
    'GIVEN a trace on a zoomed graph, pressing a step inspects that package, centres it without zooming and focuses the heading',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND config is picked in the list', async (): Promise<void> => graphList.pick('config'));

      await test.step('THEN the trace runs from web to config', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'config')));

      await test.step('WHEN the core step is pressed', async (): Promise<void> => graphDetails.pressNeighbour('core'));

      await test.step('THEN core is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('core')));

      await test.step('AND core is centred', async (): Promise<void> => graphCamera.expectCentred('core'));

      await test.step('AND the zoom is as before', async (): Promise<void> => graphCamera.expectZoomUnchanged());

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());
    }
  );
});
