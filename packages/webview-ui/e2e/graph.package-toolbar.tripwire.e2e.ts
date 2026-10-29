import { GROUPED_PAN_STEP_MS, ROWS_BOXES_IN_VIEW, ROWS_BUTTONS_SHOWN, ROWS_PAN_MS } from './common/graph-tripwire.const.ts';
import { test } from './graph-task.fixture.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { groupedToolbarLabelsOf } from './test/utils/graph-toolbar-pan.spec.util.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const LARGE = largeState();

// Tracing snapshots the DOM on every mouse move, on the page's main thread, and that CPU lands inside the measured pan.
test.use({ trace: 'off' });

test.describe('FEATURE: package toolbar tripwires', () => {
  test('GIVEN 300 packages grouped, zoomed until header rows show and one package selected with its full toolbar, a scripted 2 s pan uses under 2.4 s of main-thread CPU (4.8 s on macOS) and no step over 50 ms (90 ms on macOS)', async ({
    graphCanvas,
    graphGrouping,
    graphHost,
    graphNodeToolbar,
    graphPage,
    graphProbe,
    graphWidgets
  }): Promise<void> => {
    // The CPU budget is the gate; macOS CI runs the sibling grouped pan in 29 s of the default 30, so wall time gets 3x.
    test.slow();

    await test.step('WHEN the page is opened with a grouped view state', async (): Promise<void> =>
      graphPage.open({ savedState: groupedSavedState(LARGE.hash) }));

    await test.step('AND the 300-package state is sent', async (): Promise<void> => graphHost.sendState(LARGE));

    await test.step('THEN the grouped layout has finished', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphGrouping.expectFolderCount(30);
    });

    await test.step('WHEN Fit frames the graph and the boxes are zoomed to 120 px', async (): Promise<void> => {
      await graphPage.pressButton(FIT_LABEL);
      await graphCanvas.expectAllNodesInView();
      await graphGrouping.zoomBoxesTo(120);
    });

    await test.step('AND the graph is zoomed in until header rows show', async (): Promise<void> => graphWidgets.zoomUntilRowsShown());

    await test.step('THEN at least 4 header buttons are shown', async (): Promise<void> =>
      graphWidgets.expectHeaderButtonsShown(ROWS_BUTTONS_SHOWN));

    await test.step('AND at least 2 boxes are in view', async (): Promise<void> =>
      graphGrouping.expectBoxesInView(ROWS_BOXES_IN_VIEW));

    const name = await test.step('WHEN a package in view is tapped', async (): Promise<string> =>
      graphNodeToolbar.tapFirstNodeInView());

    const labels = groupedToolbarLabelsOf(LARGE, name);

    await test.step('THEN its node is still 130 px inside the container, clear for the pan', async (): Promise<void> =>
      graphNodeToolbar.expectNodeClearForPan(name));

    await test.step('AND its toolbar is in view', async (): Promise<void> => graphNodeToolbar.expectNodeToolbarInView(name));

    await test.step('AND its toolbar shows Focus, Start trace, Collapse folder and the "…"', async (): Promise<void> =>
      graphNodeToolbar.expectToolbarButtons(name, labels));

    await test.step('AND at least 4 header buttons are still shown', async (): Promise<void> =>
      graphWidgets.expectHeaderButtonsShown(ROWS_BUTTONS_SHOWN));

    await test.step('AND at least 2 boxes are still in view', async (): Promise<void> =>
      graphGrouping.expectBoxesInView(ROWS_BOXES_IN_VIEW));

    await test.step('WHEN it is panned for 2 s from a spot no box covers, after a 500 ms warm-up', async (): Promise<void> => {
      const spot = await graphGrouping.freeSpot();

      await graphCanvas.scriptedPan(30, 120, spot);
    });

    await test.step('THEN the pan used under its CPU and step budgets', (): void =>
      graphCanvas.expectPanCpuUnder(ROWS_PAN_MS, GROUPED_PAN_STEP_MS));

    await test.step('AND its toolbar is still in view', async (): Promise<void> => graphNodeToolbar.expectNodeToolbarInView(name));
  });
});
