import { test } from './graph.fixture.ts';
import { GHOST_EDGES_STUB, GHOST_NODES_STUB } from './test/stubs/graph-ghost-states.stub.ts';
import { GHOST_FAR_STUB, GHOST_STUB } from './test/stubs/graph-ghost.stub.ts';
import {
  SITE_TO_STORE_FACTS_STUB,
  SITE_TO_STORE_HIDDEN_FACTS_STUB,
  SITE_TO_STORE_TAGGED_FACTS_STUB
} from './test/stubs/graph-trace-facts.stub.ts';
import { traceInspection } from './test/utils/graph-inspection.spec.util.ts';
import { setViewportWidth } from './test/utils/graph-narrow.spec.util.ts';

const RF2 = { description: 'M4-3 Review Focus 2', type: 'requirement' };

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const ALL = ['wide', 'site', 'bridge', 'store'];

const WITHOUT_BRIDGE = ['wide', 'site', 'store'];

test.describe('FEATURE: graph trace ghosts', () => {
  test(
    'GIVEN a trace through bridge, unticking bridge keeps the trace and draws bridge as a dashed ghost',
    { annotation: RF2 },
    async ({ graphCanvas, graphDetails, graphHost, graphList, graphPage, graphProbe, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the ghost graph is sent', async (): Promise<void> => graphHost.sendState(GHOST_STUB));

      await test.step('AND site is tapped', async (): Promise<void> => graphCanvas.tapNode('site'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND store is picked in the list', async (): Promise<void> => graphList.pick('store'));

      await test.step('THEN the trace runs from site to store', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('site', 'store')));

      await test.step('AND no ghost is drawn', async (): Promise<void> => graphTrace.expectNoGhost());

      await test.step('WHEN bridge is unticked in the list', async (): Promise<void> => graphList.toggleRow('bridge'));

      await test.step('THEN the trace still runs from site to store', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('site', 'store')));

      await test.step('AND the trace view marks bridge hidden with a Show button', async (): Promise<void> =>
        graphTrace.expectTrace(SITE_TO_STORE_HIDDEN_FACTS_STUB));

      await test.step('AND bridge is drawn as a dashed ghost with dashed path edges', async (): Promise<void> =>
        graphTrace.expectGhost('bridge'));

      await test.step('AND the status counts one hidden package', async (): Promise<void> =>
        graphPage.expectStatus('Trace site → store: 3 packages, 1 hidden'));

      await test.step('AND the ghost is lit and wide dimmed', async (): Promise<void> =>
        graphProbe.expectNodeStates(GHOST_NODES_STUB));

      await test.step('AND the path edges are lit and the other edge dimmed', async (): Promise<void> =>
        graphProbe.expectEdgeStates(GHOST_EDGES_STUB));
    }
  );

  test(
    'GIVEN a ghost on the canvas, tapping it neither selects it nor loses the trace nor moves the camera',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the ghost graph is sent', async (): Promise<void> => graphHost.sendState(GHOST_STUB));

      await test.step('AND site is tapped', async (): Promise<void> => graphCanvas.tapNode('site'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND store is picked in the list', async (): Promise<void> => graphList.pick('store'));

      await test.step('AND bridge is unticked in the list', async (): Promise<void> => graphList.toggleRow('bridge'));

      await test.step('THEN bridge is a ghost', async (): Promise<void> => graphTrace.expectGhost('bridge'));

      await test.step('WHEN the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND the ghost is tapped', async (): Promise<void> => graphCanvas.tapNode('bridge'));

      await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

      await test.step('THEN the trace still runs from site to store', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('site', 'store')));

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN a ghost far from the other packages, Fit frames it too and keeps it on the canvas',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the far ghost graph is sent', async (): Promise<void> => graphHost.sendState(GHOST_FAR_STUB));

      await test.step('AND bridge is unticked in the list', async (): Promise<void> => graphList.toggleRow('bridge'));

      await test.step('AND Fit is pressed', async (): Promise<void> => graphPage.pressButton('Fit'));

      await test.step('THEN the three packages left are visible', async (): Promise<void> =>
        graphCamera.expectVisible(WITHOUT_BRIDGE));

      await test.step('WHEN the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND site is tapped', async (): Promise<void> => graphCanvas.tapNode('site'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND store is picked in the list', async (): Promise<void> => graphList.pick('store'));

      await test.step('THEN bridge is a ghost', async (): Promise<void> => graphTrace.expectGhost('bridge'));

      await test.step('WHEN the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('AND Fit is pressed', async (): Promise<void> => graphPage.pressButton('Fit'));

      await test.step('THEN the camera frames the ghost, not the view before the trace', async (): Promise<void> =>
        graphCamera.expectCameraMoved());

      await test.step('AND the ghost lies inside the canvas', async (): Promise<void> => graphTrace.expectGhostOnCanvas('bridge'));

      await test.step('AND bridge is still the ghost', async (): Promise<void> => graphTrace.expectGhost('bridge'));
    }
  );

  test(
    'GIVEN a ghost, Clear trace removes it and draws the packages the filters leave again',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the ghost graph is sent', async (): Promise<void> => graphHost.sendState(GHOST_STUB));

      await test.step('AND site is tapped', async (): Promise<void> => graphCanvas.tapNode('site'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND store is picked in the list', async (): Promise<void> => graphList.pick('store'));

      await test.step('AND bridge is unticked in the list', async (): Promise<void> => graphList.toggleRow('bridge'));

      await test.step('THEN bridge is a ghost', async (): Promise<void> => graphTrace.expectGhost('bridge'));

      await test.step('WHEN Clear trace is pressed', async (): Promise<void> => graphTrace.clearTrace());

      await test.step('THEN no ghost is left', async (): Promise<void> => graphTrace.expectNoGhost());

      await test.step('AND bridge is not drawn', async (): Promise<void> => graphCamera.expectVisible(WITHOUT_BRIDGE));
    }
  );

  test(
    'GIVEN a ghost, Show ticks the package again, keeps the trace and focuses the step',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphKeys, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the ghost graph is sent', async (): Promise<void> => graphHost.sendState(GHOST_STUB));

      await test.step('AND site is tapped', async (): Promise<void> => graphCanvas.tapNode('site'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND store is picked in the list', async (): Promise<void> => graphList.pick('store'));

      await test.step('AND bridge is unticked in the list', async (): Promise<void> => graphList.toggleRow('bridge'));

      await test.step('THEN bridge is a ghost', async (): Promise<void> => graphTrace.expectGhost('bridge'));

      await test.step('WHEN Show bridge is pressed', async (): Promise<void> => graphTrace.show('bridge'));

      await test.step('THEN the bridge row is ticked', async (): Promise<void> => graphList.expectRowChecked('bridge', true));

      await test.step('AND the trace still runs from site to store', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('site', 'store')));

      await test.step('AND the trace view hides nothing', async (): Promise<void> => graphTrace.expectTrace(SITE_TO_STORE_FACTS_STUB));

      await test.step('AND focus is on the bridge step', async (): Promise<void> => graphKeys.expectFocusedName('bridge'));

      await test.step('AND the status no longer counts a hidden package', async (): Promise<void> =>
        graphPage.expectStatus('Trace site → store: 3 packages'));

      await test.step('AND no ghost is left', async (): Promise<void> => graphTrace.expectNoGhost());
    }
  );

  test(
    'GIVEN a ghost, ticking its row again in the list drops the ghost in place',
    { annotation: RF2 },
    async ({ graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the ghost graph is sent', async (): Promise<void> => graphHost.sendState(GHOST_STUB));

      await test.step('AND site is tapped', async (): Promise<void> => graphCanvas.tapNode('site'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND store is picked in the list', async (): Promise<void> => graphList.pick('store'));

      await test.step('AND bridge is unticked in the list', async (): Promise<void> => graphList.toggleRow('bridge'));

      await test.step('THEN bridge is a ghost', async (): Promise<void> => graphTrace.expectGhost('bridge'));

      await test.step('WHEN bridge is ticked in the list', async (): Promise<void> => graphList.toggleRow('bridge'));

      await test.step('THEN the trace view hides nothing', async (): Promise<void> =>
        graphTrace.expectTrace(SITE_TO_STORE_FACTS_STUB));

      await test.step('AND no ghost is left', async (): Promise<void> => graphTrace.expectNoGhost());
    }
  );

  test(
    'GIVEN a trace through bridge, a tag filter that hides bridge makes a ghost with no Show button',
    { annotation: AC1 },
    async ({ graphCanvas, graphControls, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the ghost graph is sent', async (): Promise<void> => graphHost.sendState(GHOST_STUB));

      await test.step('AND site is tapped', async (): Promise<void> => graphCanvas.tapNode('site'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND store is picked in the list', async (): Promise<void> => graphList.pick('store'));

      await test.step('THEN the trace runs from site to store', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('site', 'store')));

      await test.step('WHEN the app tag is ticked', async (): Promise<void> => graphControls.toggleTag('app'));

      await test.step('THEN the trace view marks bridge hidden and offers no Show', async (): Promise<void> =>
        graphTrace.expectTrace(SITE_TO_STORE_TAGGED_FACTS_STUB));

      await test.step('AND bridge is a ghost', async (): Promise<void> => graphTrace.expectGhost('bridge'));

      await test.step('AND the status counts one hidden package', async (): Promise<void> =>
        graphPage.expectStatus('Trace site → store: 3 packages, 1 hidden'));
    }
  );

  test(
    'GIVEN a narrow editor with the panel overlaid, Show refits the ghost back and keeps the trace ends clear of the overlay',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace, page }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => setViewportWidth(page, 959));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the far ghost graph is sent', async (): Promise<void> => graphHost.sendState(GHOST_FAR_STUB));

      await test.step('AND bridge is unticked in the list', async (): Promise<void> => graphList.toggleRow('bridge'));

      await test.step('AND the details panel is toggled', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the details panel is closed', async (): Promise<void> => graphDetails.expectOpen(false));

      await test.step('WHEN site is tapped', async (): Promise<void> => graphCanvas.tapNode('site'));

      await test.step('AND the details panel is toggled', async (): Promise<void> => graphDetails.toggle());

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND store is picked in the list', async (): Promise<void> => graphList.pick('store'));

      await test.step('THEN the trace runs from site to store', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('site', 'store')));

      await test.step('WHEN Show bridge is pressed', async (): Promise<void> => graphTrace.show('bridge'));

      await test.step('THEN every package is visible', async (): Promise<void> => graphCamera.expectVisible(ALL));

      await test.step('AND the trace ends are clear of the overlay', async (): Promise<void> =>
        graphTrace.expectAnchorsClear(['site', 'store']));
    }
  );
});
