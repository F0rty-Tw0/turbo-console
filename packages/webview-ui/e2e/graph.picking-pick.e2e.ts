import { test } from './graph.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { WEB_TO_SOLO_FACTS_STUB } from './test/stubs/graph-trace-facts.stub.ts';
import { DIMMED_EDGES_STUB, NO_PATH_NODES_STUB } from './test/stubs/graph-trace-states.stub.ts';
import { pickingInspection, traceInspection } from './test/utils/graph-inspection.spec.util.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

test.describe('FEATURE: graph trace candidate pick', () => {
  test(
    'GIVEN a zoomed graph being picked from, clicking a candidate makes the trace and leaves the camera alone',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND the core candidate is clicked', async (): Promise<void> => graphTrace.pickCandidate('core'));

      await test.step('THEN the trace runs from web to core', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('web', 'core')));

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());
    }
  );

  test(
    'GIVEN a trace being picked, a candidate with no path makes a trace that says so and dims everything else',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage, graphProbe, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND the solo candidate is clicked', async (): Promise<void> => graphTrace.pickCandidate('solo'));

      await test.step('THEN the trace view says there is no path', async (): Promise<void> =>
        graphTrace.expectTrace(WEB_TO_SOLO_FACTS_STUB));

      await test.step('AND the status says there is no path', async (): Promise<void> =>
        graphPage.expectStatus('No dependency path between web and solo'));

      await test.step('AND both ends are selected and the rest dimmed', async (): Promise<void> =>
        graphProbe.expectNodeStates(NO_PATH_NODES_STUB));

      await test.step('AND every edge is dimmed', async (): Promise<void> => graphProbe.expectEdgeStates(DIMMED_EDGES_STUB));
    }
  );

  test(
    'GIVEN a trace being picked, tapping a link nudges toward a package, keeps picking and selects no edge',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphLink, graphPage, graphProbe, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('THEN web is being picked from, nudged', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web', true)));

      await test.step('AND the status asks for a package', async (): Promise<void> =>
        graphPage.expectStatus('Pick a package to end the trace'));

      await test.step('AND the canvas hint asks for a package', async (): Promise<void> =>
        graphTrace.expectHint('Pick a package to end the trace'));

      await test.step('AND the hint draws the info icon, not the trace icon', async (): Promise<void> =>
        graphTrace.expectHintNudged(true));

      await test.step('AND the picking view is still shown', async (): Promise<void> => graphTrace.expectPicking('web'));

      await test.step('AND the link edge is not selected', async (): Promise<void> => graphProbe.expectEdgeStates(DIMMED_EDGES_STUB));

      await test.step('WHEN the web to ui link is tapped again', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

      await test.step('THEN web is still being picked from, nudged', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web', true)));

      await test.step('AND the hint text did not change', async (): Promise<void> =>
        graphTrace.expectHint('Pick a package to end the trace'));
    }
  );

  test(
    'GIVEN a focused candidate, unticking it in the list drops it and focuses the heading, but a click in the list keeps focus there',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphKeys, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND the core candidate is focused', async (): Promise<void> => graphTrace.focusCandidate('core'));

      await test.step('AND core is unticked without moving focus', async (): Promise<void> => graphList.uncheckWithoutFocus('core'));

      await test.step('THEN web is still being picked from', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));

      await test.step('AND core is gone from the candidates', async (): Promise<void> =>
        graphTrace.expectCandidates('forward', ['data', 'ui', 'config', 'base'], 4));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('WHEN the data candidate is focused', async (): Promise<void> => graphTrace.focusCandidate('data'));

      await test.step('AND base is unticked by a click in the list', async (): Promise<void> => graphList.toggleRow('base'));

      await test.step('THEN focus stays in the list', async (): Promise<void> => graphKeys.expectFocusedName('Show base'));
    }
  );

  test(
    'GIVEN a trace being picked, tapping the start or picking it in the list keeps picking',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND web is tapped again', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

      await test.step('THEN web is still being picked from', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));

      await test.step('WHEN web is picked in the list', async (): Promise<void> => graphList.pick('web'));

      await test.step('AND two frames pass', async (): Promise<void> => graphPage.waitFrames());

      await test.step('THEN web is still being picked from', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));

      await test.step('AND the picking view is shown', async (): Promise<void> => graphTrace.expectPicking('web'));
    }
  );

  test('GIVEN a trace being picked from web, double-tapping web posts openDetails for web and keeps picking', async ({
    graphCanvas,
    graphDetails,
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

    await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

    await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

    await test.step('AND web is double-tapped', async (): Promise<void> => graphCanvas.doubleTapNode('web'));

    await test.step('THEN the host received openDetails for web', async (): Promise<void> => graphHost.expectOpenDetails('web'));

    await test.step('AND web is still being picked from', async (): Promise<void> =>
      graphDetails.expectInspection(pickingInspection('web', false)));
  });
});
