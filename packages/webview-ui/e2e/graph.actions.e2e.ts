import type { ElementRect, ViewportPoint } from './common/playwright.type.ts';
import { expect, test } from './graph.fixture.ts';
import { DETAILS_NAMES_STUB, DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { without } from './test/utils/graph-controls.spec.util.ts';
import { emptySpotOf, nodeAt } from './test/utils/graph-geometry.spec.util.ts';
import { NONE_INSPECTION, linkInspection, packageInspection } from './test/utils/graph-inspection.spec.util.ts';
import type { ProbeEdge, ProbeNode } from '../src/graph/common/graph-probe.type.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const UI_FOCUSED = ['ui', 'core', 'web', 'admin'];

const CONTAINER: ElementRect = { left: 0, top: 0, width: 800, height: 600 };

const A_AND_B: ProbeNode[] = [nodeAt('a', -100, -100), nodeAt('b', 200, 200)];

const DRAWN_EDGE: ProbeEdge = { source: 'a', target: 'b', state: 'normal', isGhost: false, isDrawn: true, lineStyle: 'solid' };

const UNDRAWN_EDGE: ProbeEdge = { ...DRAWN_EDGE, isDrawn: false };

const DRAWN_EDGES: ProbeEdge[] = [DRAWN_EDGE];

const UNDRAWN_EDGES: ProbeEdge[] = [UNDRAWN_EDGE];

const FIRST_CORNER: ViewportPoint = { x: 12, y: 12 };

const SECOND_CORNER: ViewportPoint = { x: 788, y: 12 };

test.describe('FEATURE: graph details actions', () => {
  test(
    'GIVEN a tapped package, View Package Details asks the host to open it',
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND View Package Details is pressed', async (): Promise<void> => graphDetails.openPackageDetails());

      await test.step('THEN the host got one openDetails for web', async (): Promise<void> => graphHost.expectOpenDetails('web'));
    }
  );

  test(
    'GIVEN a tapped package, Focus narrows the graph and keeps focus on the button, which then clears it',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphKeys, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND ui is tapped', async (): Promise<void> => graphCanvas.tapNode('ui'));

      await test.step('AND the Focus button is focused', async (): Promise<void> => graphDetails.focusButton('Focus'));

      await test.step('AND Focus is pressed', async (): Promise<void> => graphDetails.focus());

      await test.step('THEN only ui and its neighbours are visible', async (): Promise<void> => graphCamera.expectVisible(UI_FOCUSED));

      await test.step('AND the button reads Clear focus', async (): Promise<void> => graphDetails.expectFocusLabel('Clear focus'));

      await test.step('AND the same button holds focus', async (): Promise<void> => graphKeys.expectFocusedName('Clear focus'));

      await test.step('AND ui is still inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('ui')));

      await test.step('AND the ui row is locked', async (): Promise<void> => graphList.expectRowLocked('ui'));

      await test.step('WHEN Clear focus is pressed', async (): Promise<void> => graphDetails.clearFocus());

      await test.step('THEN every package is visible', async (): Promise<void> => graphCamera.expectVisible(DETAILS_NAMES_STUB));

      await test.step('AND the button reads Focus', async (): Promise<void> => graphDetails.expectFocusLabel('Focus'));

      await test.step('AND the same button holds focus', async (): Promise<void> => graphKeys.expectFocusedName('Focus'));
    }
  );

  test(
    'GIVEN a tapped package, Exclude unticks it, empties the panel and puts focus on its heading',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Exclude is pressed', async (): Promise<void> => graphDetails.exclude());

      await test.step('THEN the web row is unchecked', async (): Promise<void> => graphList.expectRowChecked('web', false));

      await test.step('AND web is no longer visible', async (): Promise<void> =>
        graphCamera.expectVisible(without(DETAILS_NAMES_STUB, ['web'])));

      await test.step('AND nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NONE_INSPECTION));

      await test.step('AND the panel is empty', async (): Promise<void> => graphDetails.expectEmpty());

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('AND the status line is empty', async (): Promise<void> => graphPage.expectStatus(''));

      await test.step('AND Clear selection is disabled', async (): Promise<void> => graphPage.expectDisabled('Clear selection'));

      await test.step('WHEN the web row is ticked again', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('THEN every package is visible', async (): Promise<void> => graphCamera.expectVisible(DETAILS_NAMES_STUB));

      await test.step('AND the panel is still empty', async (): Promise<void> => graphDetails.expectEmpty());
    }
  );

  test(
    'GIVEN the focused package, Exclude does nothing',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND ui is tapped', async (): Promise<void> => graphCanvas.tapNode('ui'));

      await test.step('AND Focus is pressed', async (): Promise<void> => graphDetails.focus());

      await test.step('AND Exclude is pressed', async (): Promise<void> => graphDetails.exclude());

      await test.step('THEN Exclude reads disabled', async (): Promise<void> => graphDetails.expectExcludeDisabled(true));

      await test.step('AND the ui row is still checked', async (): Promise<void> => graphList.expectRowChecked('ui', true));

      await test.step('AND ui is still inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('ui')));

      await test.step('AND only ui and its neighbours are visible', async (): Promise<void> => graphCamera.expectVisible(UI_FOCUSED));
    }
  );

  test(
    'GIVEN a zoomed graph and a tapped package, a neighbour button swaps the package, centres it and focuses the heading',
    { annotation: AC1 },
    async ({ graphCamera, graphCanvas, graphDetails, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND the ui neighbour is pressed', async (): Promise<void> => graphDetails.pressNeighbour('ui'));

      await test.step('THEN ui is inspected', async (): Promise<void> => graphDetails.expectInspection(packageInspection('ui')));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('AND ui is centred', async (): Promise<void> => graphCamera.expectCentred('ui'));

      await test.step('AND the zoom is as before', async (): Promise<void> => graphCamera.expectZoomUnchanged());
    }
  );

  test(
    "GIVEN tapped packages, a neighbour's Explain opens the link dependent first and focuses the heading",
    { annotation: AC1 },
    async ({ graphCanvas, graphDetails, graphHost, graphLink, graphPage, graphReplies }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the Explain of its dependent data is pressed', async (): Promise<void> =>
        graphDetails.explain('data', 'core'));

      await test.step('THEN the data to core link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('data', 'core')));

      await test.step('AND the panel shows the link', async (): Promise<void> => graphLink.expectLink('data', 'core'));

      await test.step('AND the host was asked to explain it once', async (): Promise<void> =>
        graphReplies.expectExplainAsked('data', 'core', 1));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('WHEN web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND the Explain of its dependency data is pressed', async (): Promise<void> =>
        graphDetails.explain('web', 'data'));

      await test.step('THEN the web to data link is inspected', async (): Promise<void> =>
        graphDetails.expectInspection(linkInspection('web', 'data')));

      await test.step('AND the host was asked to explain it once', async (): Promise<void> =>
        graphReplies.expectExplainAsked('web', 'data', 1));

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());
    }
  );

  test(
    'GIVEN an edge across the first corner, the empty spot skips the corner unless the edge is undrawn',
    { annotation: AC1 },
    async (): Promise<void> => {
      const beside = await test.step('WHEN an empty spot is looked for with a drawn edge across the first corner', (): ViewportPoint =>
        emptySpotOf(CONTAINER, A_AND_B, DRAWN_EDGES, 1));

      await test.step('THEN the next corner is returned', (): void => expect(beside).toEqual(SECOND_CORNER));

      const undrawn = await test.step('WHEN an empty spot is looked for with that edge undrawn', (): ViewportPoint =>
        emptySpotOf(CONTAINER, A_AND_B, UNDRAWN_EDGES, 1));

      await test.step('THEN the first corner is returned', (): void => expect(undrawn).toEqual(FIRST_CORNER));
    }
  );
});
