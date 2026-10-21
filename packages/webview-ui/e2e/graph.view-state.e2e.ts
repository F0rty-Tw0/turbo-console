import { test } from './graph.fixture.ts';
import { DIAMOND_CHAIN_CACHED_STUB, EDITED_STUB } from './test/stubs/graph-state.stub.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const AC3 = { description: 'M4-1 AC3', type: 'requirement' };

const ORIGIN = { x: 0, y: 0 };

/** The diamond's hash and a real package, but a zoom that is not a number. */
const BAD_ZOOM_VIEW = { hash: 'a1b2c3d4', zoom: 'wide', pan: ORIGIN, selected: 'core' };

test.describe('FEATURE: graph view state', () => {
  test(
    'GIVEN a zoomed, panned graph with core selected, reopening with the saved view restores it',
    { annotation: AC3 },
    async ({ graphCanvas, graphHost, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('THEN the view is saved', async (): Promise<void> => graphHost.expectViewSaved());

      const carried = await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND the same state is sent again', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('THEN zoom, pan and selection are the saved ones', async (): Promise<void> => graphLook.expectView(carried));

      await test.step('AND no worker was created', async (): Promise<void> => graphHost.expectWorkers(0));
    }
  );

  test(
    'GIVEN a saved view for another hash, the page fits and keeps a selection that still exists',
    { annotation: AC3 },
    async ({ graphCanvas, graphHost, graphLook, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('THEN the view is saved', async (): Promise<void> => graphHost.expectViewSaved());

      const carried = await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND an edited graph state without positions is sent', async (): Promise<void> =>
        graphHost.sendState(EDITED_STUB));

      await test.step('THEN the layout came from ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND the view was fitted, not restored', async (): Promise<void> => graphLook.expectViewNot(carried));

      await test.step('AND core is still selected', async (): Promise<void> => graphProbe.expectSelected('core'));
    }
  );

  test(
    'GIVEN a saved selection whose package is gone, the selection is dropped',
    { annotation: AC3 },
    async ({ graphCanvas, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the edited graph state is sent', async (): Promise<void> => graphHost.sendState(EDITED_STUB));

      await test.step('AND cli is tapped', async (): Promise<void> => graphCanvas.tapNode('cli'));

      await test.step('THEN cli is selected', async (): Promise<void> => graphProbe.expectSelected('cli'));

      await test.step('AND the view is saved', async (): Promise<void> => graphHost.expectViewSaved());

      await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> => graphHost.reopen());

      await test.step('AND a cached state without cli is sent', async (): Promise<void> =>
        graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('THEN nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));
    }
  );

  test('GIVEN a saved view whose zoom is not a number, the page ignores it, fits and selects nothing', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened with that saved view', async (): Promise<void> =>
      graphPage.open({ savedState: BAD_ZOOM_VIEW }));

    await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

    await test.step('THEN seven nodes are drawn', async (): Promise<void> => graphProbe.expectNodeCount(7));

    await test.step('AND nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));

    await test.step('AND every node lies inside the container', async (): Promise<void> => graphCanvas.expectAllNodesInView());

    await test.step('AND no console or page error is logged', (): void => graphPage.expectNoErrors());
  });
});
