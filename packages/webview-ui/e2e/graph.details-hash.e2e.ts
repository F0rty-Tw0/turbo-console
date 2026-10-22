import { test } from './graph.fixture.ts';
import { DETAILS_EDITED_STUB, DETAILS_RECOUNT_STUB, DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { FOUND_UI_STUB, UI_ENTRIES_STUB } from './test/stubs/graph-explain.stub.ts';
import { WEB_RECOUNT_FACTS_STUB } from './test/stubs/graph-saved.stub.ts';
import { WEB_TO_BASE_FACTS_STUB, WEB_TO_BASE_SHORT_FACTS_STUB } from './test/stubs/graph-trace-facts.stub.ts';
import { NONE_INSPECTION, linkInspection, packageInspection } from './test/utils/graph-inspection.spec.util.ts';

const C5 = { description: 'M4-3 C5', type: 'requirement' };

const RF1 = { description: 'M4-3 Review Focus 1', type: 'requirement' };

test.describe('FEATURE: graph details after a new graph hash', () => {
  test(
    'GIVEN a link shown, a graph with a new hash rebuilds the link view and asks the host again',
    { annotation: C5 },
    async ({ graphDetails, graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the host answers with two entries', async (): Promise<void> => graphReplies.answerExplain(FOUND_UI_STUB));

      await test.step('AND the edited graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_EDITED_STUB));

      await test.step('THEN the web to ui link is still inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'ui')));

      await test.step('AND the panel reads apps/web/package.json again', async (): Promise<void> =>
        graphLink.expectReading('apps/web/package.json'));

      await test.step('AND the host was asked to explain it twice', async (): Promise<void> =>
        graphReplies.expectExplainAsked('web', 'ui', 2));

      await test.step('WHEN the host answers with two entries', async (): Promise<void> => graphReplies.answerExplain(FOUND_UI_STUB));

      await test.step('THEN both entries are listed', async (): Promise<void> => graphLink.expectEntries(UI_ENTRIES_STUB));
    }
  );

  test(
    'GIVEN a trace shown, a graph with a new hash recomputes the shortest path',
    { annotation: C5 },
    async ({ graphCanvas, graphDetails, graphHost, graphList, graphPage, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND base is picked in the list', async (): Promise<void> => graphList.pick('base'));

      await test.step('THEN the trace takes five packages', async (): Promise<void> => graphTrace.expectTrace(WEB_TO_BASE_FACTS_STUB));

      await test.step('WHEN the edited graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_EDITED_STUB));

      await test.step('THEN the trace takes three packages', async (): Promise<void> =>
        graphTrace.expectTrace(WEB_TO_BASE_SHORT_FACTS_STUB));

      await test.step('AND the status counts three packages', async (): Promise<void> =>
        graphPage.expectStatus('Trace web → base: 3 packages'));
    }
  );

  test(
    'GIVEN a trace being picked, a graph with a new hash shows the package view of its start',
    { annotation: C5 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND the edited graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_EDITED_STUB));

      await test.step('THEN web is inspected as a package', async (): Promise<void> =>
        graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND the panel is titled web', async (): Promise<void> => graphDetails.expectHeading('web'));
    }
  );

  test(
    'GIVEN a package that the next graph no longer has, a graph with a new hash empties the panel and the status',
    { annotation: C5 },
    async ({ graphDetails, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND solo is picked in the list', async (): Promise<void> => graphList.pick('solo'));

      await test.step('AND the edited graph, which has no solo, is sent', async (): Promise<void> =>
        graphHost.sendState(DETAILS_EDITED_STUB));

      await test.step('THEN nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NONE_INSPECTION));

      await test.step('AND the panel is empty', async (): Promise<void> => graphDetails.expectEmpty());

      await test.step('AND the status is blank', async (): Promise<void> => graphPage.expectStatus(''));
    }
  );

  test(
    'GIVEN focus inside the panel, a graph with a new hash moves it to the title and a focus outside stays put',
    { annotation: C5 },
    async ({ graphCanvas, graphDetails, graphHost, graphKeys, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND data is tapped', async (): Promise<void> => graphCanvas.tapNode('data'));

      await test.step('AND focus goes to Exclude', async (): Promise<void> => graphDetails.focusButton('Exclude'));

      await test.step('AND the edited graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_EDITED_STUB));

      await test.step('THEN the dependencies are the edited ones', async (): Promise<void> =>
        graphDetails.expectNeighbours('Direct dependencies', ['base', 'core']));

      await test.step('AND the title holds focus', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('WHEN focus goes back to the search', async (): Promise<void> => graphKeys.shiftTabTo('Search packages'));

      await test.step('AND the details graph is sent again', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the search box keeps focus', async (): Promise<void> => graphKeys.expectFocusedName('Search packages'));
    }
  );

  test(
    'GIVEN a package view with focus on Focus, a graph with the same hash updates the task count in place',
    { annotation: RF1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphKeys, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND focus goes to Focus', async (): Promise<void> => graphDetails.focusButton('Focus'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('WHEN the recounted graph with the same hash is sent', async (): Promise<void> =>
        graphHost.sendState(DETAILS_RECOUNT_STUB));

      await test.step('THEN the Package Details button reads six tasks', async (): Promise<void> =>
        graphDetails.expectFacts(WEB_RECOUNT_FACTS_STUB));

      await test.step('AND focus stays on Focus', async (): Promise<void> => graphKeys.expectFocusedName('Focus'));

      await test.step('AND the host was asked to explain nothing', async (): Promise<void> => graphReplies.expectNoExplainAsked());

      await test.step('AND the camera is as before', async (): Promise<void> => graphCamera.expectCameraUnchanged());

      await test.step('AND no worker was created', async (): Promise<void> => graphHost.expectWorkers(0));
    }
  );
});
