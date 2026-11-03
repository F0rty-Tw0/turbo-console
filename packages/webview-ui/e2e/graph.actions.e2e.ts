import type { ElementRect, ViewportPoint } from './common/playwright.type.ts';
import { expect, test } from './graph-task.fixture.ts';
import { DETAILS_NAMES_STUB, DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { without } from './test/utils/graph-controls.spec.util.ts';
import { emptySpotOf, freeSpotOf, nodeAt } from './test/utils/graph-geometry.spec.util.ts';
import { linkInspection, packageInspection } from './test/utils/graph-inspection.spec.util.ts';
import { lineThrough, midpointsUnderCountOf, throughNodeCountOf } from './test/utils/graph-lines.spec.util.ts';
import type { ProbeEdgeLine, ProbeNode } from '../src/graph/common/graph-probe.type.ts';
import { NO_INSPECTION } from '../src/graph/common/inspection.const.ts';

const AC1 = { description: 'M4-3 AC1', type: 'requirement' };

const UI_FOCUSED = ['ui', 'core', 'web', 'admin'];

const CONTAINER: ElementRect = { left: 0, top: 0, width: 800, height: 600 };

const A_AND_B: ProbeNode[] = [nodeAt('a', -100, -100), nodeAt('b', 200, 200)];

const DRAWN_EDGE: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: -100, y: -100 },
  { x: 200, y: 200 }
]);

const UNDRAWN_EDGE: ProbeEdgeLine = { ...DRAWN_EDGE, isDrawn: false, points: [] };

const DRAWN_EDGES: ProbeEdgeLine[] = [DRAWN_EDGE];

const UNDRAWN_EDGES: ProbeEdgeLine[] = [UNDRAWN_EDGE];

/** An L round the first corner: its straight chord from the first to the last point would pass 200 px from that corner. */
const L_AROUND_FIRST_CORNER: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 12, y: 300 },
  { x: 12, y: 12 },
  { x: 300, y: 12 }
]);

/** Along the first row of the 20 px grid `freeSpotOf` searches. */
const FIRST_GRID_ROW: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 0, y: 2 },
  { x: 800, y: 2 }
]);

const SECOND_GRID_ROW_SPOT: ViewportPoint = { x: 2, y: 22 };

const ACROSS_MIDDLE_NODE: ProbeNode[] = [nodeAt('a', 100, 100), nodeAt('b', 500, 100), nodeAt('c', 300, 100)];

const BESIDE_ENDS_NODE: ProbeNode[] = [nodeAt('a', 100, 100), nodeAt('b', 500, 100), nodeAt('c', 300, 400)];

const A_TO_B_LEVEL: ProbeEdgeLine = lineThrough('a', 'b', [
  { x: 100, y: 100 },
  { x: 500, y: 100 }
]);

const INSET_PX = 2;

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
    async ({ graphCamera, graphCanvas, graphDetails, graphDetailsBar, graphHost, graphList, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the details graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_STUB));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('AND Exclude is pressed', async (): Promise<void> => graphDetails.exclude());

      await test.step('THEN the web row is unchecked', async (): Promise<void> => graphList.expectRowChecked('web', false));

      await test.step('AND web is no longer visible', async (): Promise<void> =>
        graphCamera.expectVisible(without(DETAILS_NAMES_STUB, ['web'])));

      await test.step('AND nothing is inspected', async (): Promise<void> => graphDetails.expectInspection(NO_INSPECTION));

      await test.step('AND the panel is empty', async (): Promise<void> => graphDetails.expectEmpty());

      await test.step('AND focus is on the panel heading', async (): Promise<void> => graphDetails.expectHeadingFocused());

      await test.step('AND the status line is empty', async (): Promise<void> => graphPage.expectStatus(''));

      await test.step('AND the Details bar is hidden and Clear selection disabled', async (): Promise<void> =>
        graphDetailsBar.expectClearHidden());

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

  test(
    'GIVEN a routed L-shaped line round the first corner, the empty spot is not that corner',
    { annotation: AC1 },
    async (): Promise<void> => {
      const spot = await test.step('WHEN an empty spot is looked for with the L drawn', (): ViewportPoint =>
        emptySpotOf(CONTAINER, [], [L_AROUND_FIRST_CORNER], 1));

      await test.step('THEN the next corner is returned', (): void => expect(spot).toEqual(SECOND_CORNER));
    }
  );

  test(
    'GIVEN a line along the first grid row, the free spot keeps its clearance from the line',
    { annotation: AC1 },
    async (): Promise<void> => {
      const spot = await test.step('WHEN a free spot is looked for', (): ViewportPoint => freeSpotOf(CONTAINER, [], [FIRST_GRID_ROW]));

      await test.step('THEN the first grid row farther than the clearance is returned', (): void =>
        expect(spot).toEqual(SECOND_GRID_ROW_SPOT));
    }
  );

  test(
    'GIVEN a line across a third node, only the third node counts as passed through',
    { annotation: AC1 },
    async (): Promise<void> => {
      const across = await test.step('WHEN lines through nodes are counted with the third node across the line', (): number =>
        throughNodeCountOf([A_TO_B_LEVEL], ACROSS_MIDDLE_NODE, 1, INSET_PX));

      await test.step('THEN the line passes through 1 node', (): void => expect(across).toBe(1));

      const beside = await test.step('WHEN they are counted with the third node beside the line', (): number =>
        throughNodeCountOf([A_TO_B_LEVEL], BESIDE_ENDS_NODE, 1, INSET_PX));

      await test.step('THEN the line, touching only its own ends, passes through 0', (): void => expect(beside).toBe(0));
    }
  );

  test(
    'GIVEN a line whose midpoint is under a third node, the midpoints under nodes are counted',
    { annotation: AC1 },
    async (): Promise<void> => {
      const under = await test.step('WHEN the midpoints are counted with the third node across the line', (): number =>
        midpointsUnderCountOf([A_TO_B_LEVEL], ACROSS_MIDDLE_NODE, 1));

      await test.step('THEN 1 midpoint is under a node', (): void => expect(under).toBe(1));

      const none = await test.step('WHEN they are counted with the third node beside the line', (): number =>
        midpointsUnderCountOf([A_TO_B_LEVEL], BESIDE_ENDS_NODE, 1));

      await test.step('THEN none is', (): void => expect(none).toBe(0));
    }
  );
});
