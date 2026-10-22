import { DOCKED_WIDTH_PX, OVERLAY_WIDTH_PX } from './common/graph.const.ts';
import { expect, test } from './graph.fixture.ts';
import { PROTO_DETAILS_STUB } from './test/stubs/graph-details-edge.stub.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { FOUND_UI_STUB, UI_ENTRIES_STUB } from './test/stubs/graph-explain.stub.ts';
import { GHOST_EDGES_STUB, GHOST_NODES_STUB } from './test/stubs/graph-ghost-states.stub.ts';
import { GHOST_STUB } from './test/stubs/graph-ghost.stub.ts';
import { WEB_UI_EDGES_STUB, WEB_UI_NODES_STUB } from './test/stubs/graph-link-states.stub.ts';
import { SAVED_BASE_STUB, WEB_FACTS_STUB, WEB_STATUS_STUB } from './test/stubs/graph-saved.stub.ts';
import { SITE_TO_STORE_HIDDEN_FACTS_STUB } from './test/stubs/graph-trace-facts.stub.ts';
import { linkInspection, packageInspection, pickingInspection, traceInspection } from './test/utils/graph-inspection.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const C5 = { description: 'M4-3 C5', type: 'requirement' };

const RF2 = { description: 'M4-3 Review Focus 2', type: 'requirement' };

const RF5 = { description: 'M4-3 Review Focus 5', type: 'requirement' };

const C8 = { description: 'M4-3 C8', type: 'requirement' };

const WITHOUT_BRIDGE = ['wide', 'site', 'store'];

const DOCS_UNDER_OVERLAY: GraphViewState = { ...SAVED_BASE_STUB, selected: 'docs' };

test.describe('FEATURE: graph details saved state', () => {
  test(
    'GIVEN web inspected with the panel collapsed and the camera moved by hand, reopening restores all three without a refit',
    { annotation: C5 },
    async ({ graphCanvas, graphDetails, graphHost, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('AND the panel is collapsed', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      const carried = await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND the details graph is sent again', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND the panel is collapsed', async (): Promise<void> => graphDetails.expectOpen(false));

      await test.step('AND the camera is the hand-moved one', async (): Promise<void> => graphLook.expectView(carried));

      await test.step('AND no worker was created', async (): Promise<void> => graphHost.expectWorkers(0));

      await test.step('AND the status names web', async (): Promise<void> => graphPage.expectStatus(WEB_STATUS_STUB));

      await test.step('WHEN the panel is opened', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the panel is titled web', async (): Promise<void> => graphDetails.expectHeading('web'));

      await test.step('AND the panel shows the facts of web', async (): Promise<void> => graphDetails.expectFacts(WEB_FACTS_STUB));
    }
  );

  test(
    'GIVEN a link inspected, reopening restores it, asks the host to explain it again and lists the entries once answered',
    { annotation: C5 },
    async ({ graphCanvas, graphDetails, graphHost, graphLink, graphLook, graphPage, graphProbe, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND the web to ui link is tapped', async (): Promise<void> => graphLink.tapLink('web', 'ui'));

      await test.step('AND the host answers with two entries', async (): Promise<void> => graphReplies.answerExplain(FOUND_UI_STUB));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('THEN the view is saved', async (): Promise<void> => graphHost.expectViewSaved());

      await test.step('AND the web to ui link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'ui')));

      const carried = await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND the details graph is sent again', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the web to ui link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'ui')));

      await test.step('AND the panel reads apps/web/package.json', async (): Promise<void> =>
        graphLink.expectReading('apps/web/package.json'));

      await test.step('AND the host was asked to explain it once', async (): Promise<void> =>
        graphReplies.expectExplainAsked('web', 'ui', 1));

      await test.step('AND web and ui are lit and the rest dimmed', async (): Promise<void> =>
        graphProbe.expectNodeStates(WEB_UI_NODES_STUB));

      await test.step('AND the web to ui edge is selected and the rest dimmed', async (): Promise<void> =>
        graphProbe.expectEdgeStates(WEB_UI_EDGES_STUB));

      await test.step('AND the camera is the hand-moved one', async (): Promise<void> => graphLook.expectView(carried));

      await test.step('AND no package is selected', async (): Promise<void> => graphProbe.expectSelected(null));

      await test.step('WHEN the host answers with two entries', async (): Promise<void> => graphReplies.answerExplain(FOUND_UI_STUB));

      await test.step('THEN both entries are listed', async (): Promise<void> => graphLink.expectEntries(UI_ENTRIES_STUB));
    }
  );

  test(
    'GIVEN a trace through a hidden bridge, reopening restores the trace with its ghost and the same camera',
    { annotation: RF2 },
    async ({
      graphCamera,
      graphCanvas,
      graphDetails,
      graphHost,
      graphList,
      graphLook,
      graphPage,
      graphProbe,
      graphTrace
    }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the ghost graph is sent', async (): Promise<void> => graphHost.sendState(GHOST_STUB));

      await test.step('AND site is tapped', async (): Promise<void> => graphCanvas.tapNode('site'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('AND store is picked in the list', async (): Promise<void> => graphList.pick('store'));

      await test.step('AND bridge is unticked in the list', async (): Promise<void> => graphList.toggleRow('bridge'));

      await test.step('THEN the trace runs from site to store', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('site', 'store')));

      const carried = await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND the ghost graph is sent again', async (): Promise<void> => graphHost.sendState(GHOST_STUB));

      await test.step('THEN the trace runs from site to store', async (): Promise<void> =>
        graphDetails.expectInspection(traceInspection('site', 'store')));

      await test.step('AND the trace view marks bridge hidden', async (): Promise<void> =>
        graphTrace.expectTrace(SITE_TO_STORE_HIDDEN_FACTS_STUB));

      await test.step('AND bridge is drawn as a ghost', async (): Promise<void> => graphTrace.expectGhost('bridge'));

      await test.step('AND only the other three packages are visible', async (): Promise<void> =>
        graphCamera.expectVisible(WITHOUT_BRIDGE));

      await test.step('AND the saved selection is the trace start', (): void => expect(carried.selected).toBe('site'));

      await test.step('AND the saved trace is site to store', (): void =>
        expect(carried.trace).toEqual({ start: 'site', end: 'store' }));

      await test.step('AND the camera is the saved one', async (): Promise<void> =>
        graphLook.expectView({ ...carried, selected: null }));

      await test.step('AND the canvas selects no package', async (): Promise<void> => graphProbe.expectSelected(null));

      await test.step('AND the ghost is lit and wide dimmed', async (): Promise<void> =>
        graphProbe.expectNodeStates(GHOST_NODES_STUB));

      await test.step('AND the path edges are lit and the other edge dimmed', async (): Promise<void> =>
        graphProbe.expectEdgeStates(GHOST_EDGES_STUB));
    }
  );

  test(
    'GIVEN a trace being picked, reopening restores the package view, never a trace',
    { annotation: C5 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Start trace is pressed', async (): Promise<void> => graphDetails.startTrace());

      await test.step('THEN web is being picked from', async (): Promise<void> =>
        graphDetails.expectInspection(pickingInspection('web')));

      await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> => graphHost.reopen());

      await test.step('AND the details graph is sent again', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN web is inspected as a package', async (): Promise<void> =>
        graphDetails.expectInspection(packageInspection('web')));

      await test.step('AND the panel is titled web', async (): Promise<void> => graphDetails.expectHeading('web'));

      await test.step('AND web is selected', async (): Promise<void> => graphProbe.expectSelected('web'));
    }
  );

  test(
    'GIVEN a link between packages named like Object members, reopening restores it and logs no error',
    { annotation: RF5 },
    async ({ graphDetails, graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the proto graph is sent', async (): Promise<void> => graphHost.sendState(PROTO_DETAILS_STUB));

      await test.step('AND the __proto__ to constructor link is tapped', async (): Promise<void> =>
        graphLink.tapLink('__proto__', 'constructor'));

      await test.step('THEN the link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('__proto__', 'constructor')));

      await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> => graphHost.reopen());

      await test.step('AND the proto graph is sent again', async (): Promise<void> => graphHost.sendState(PROTO_DETAILS_STUB));

      await test.step('THEN the link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('__proto__', 'constructor')));

      await test.step('AND the link view is shown', async (): Promise<void> => graphLink.expectLink('__proto__', 'constructor'));

      await test.step('AND the host was asked to explain it once', async (): Promise<void> =>
        graphReplies.expectExplainAsked('__proto__', 'constructor', 1));

      await test.step('AND the page raised no errors', (): void => graphPage.expectNoErrors());
    }
  );

  test(
    'GIVEN a saved camera that leaves docs under the overlay, restoring inspects docs and does not pan',
    { annotation: C8 },
    async ({ graphDetails, graphHost, graphLook, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('AND the page is opened with docs saved as selected', async (): Promise<void> =>
        graphPage.open({ savedState: DOCS_UNDER_OVERLAY }));

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN docs is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('docs')));

      await test.step('AND the camera is the saved one', async (): Promise<void> => graphLook.expectView(DOCS_UNDER_OVERLAY));
    }
  );

  test(
    'GIVEN the panel closed with its close button in an overlay, reopening keeps it closed at 960 px too',
    { annotation: C8 },
    async ({ graphCanvas, graphDetails, graphHost, graphNarrow, graphPage }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('AND the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Close details is pressed', async (): Promise<void> => graphNarrow.closeDetails());

      await test.step('THEN the panel is closed', async (): Promise<void> => graphDetails.expectOpen(false));

      await test.step('AND web is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('web')));

      const carried = await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND the editor is widened to 960 px', async (): Promise<void> => graphNarrow.setWidth(DOCKED_WIDTH_PX));

      await test.step('AND the details graph is sent again', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('THEN the saved state says the panel is closed', (): void => expect(carried.detailsOpen).toBe(false));

      await test.step('AND the docked panel is closed', async (): Promise<void> => graphDetails.expectOpen(false));
    }
  );
});
