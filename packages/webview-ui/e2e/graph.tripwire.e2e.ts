import { LARGE_PACKAGE_COUNT } from './common/graph.const.ts';
import { test } from './graph.fixture.ts';
import { PKG_299_TO_000_FACTS_STUB } from './test/stubs/graph-trace-facts.stub.ts';
import { hubGraphState } from './test/utils/graph-hub.spec.util.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';

const AC6 = { description: 'M4-2 AC6', type: 'requirement' };

/**
 * The smallest of 5 wall-time samples of each isolated step, because starvation inflates single samples but rarely all
 * five, while a slower CPU or an 80 ms busy-wait raises every one. Normal runs read about 15 and 5 ms.
 * A hard cgroup quota at or below 25% is outside the contract: every build sample also pays the 300-node draw,
 * so the quota freeze covers all five.
 */
const SAMPLES = 5;

const BUILD_COUNTS = [300, 301, 300, 301, 300];

const BUDGET_MS = 50;

const HUB_DEPENDENTS = LARGE_PACKAGE_COUNT - 1;

/** Each sample toggles pkg-007 once, so an odd count leaves it hidden. */
const LAST_VISIBLE = LARGE_PACKAGE_COUNT - (SAMPLES % 2);

test.describe('FEATURE: graph tripwires', () => {
  test('GIVEN a 14-package target-like graph, the first frame lands under 2 s', async ({
    graphHost,
    graphLook,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the target-like state is sent', async (): Promise<void> => graphHost.sendState(targetLikeState()));

    await test.step('THEN the first frame came in under 2000 ms', async (): Promise<void> => graphLook.expectFirstFrameUnder(2000));

    await test.step('AND the ELK time and the main.js size are recorded', async (): Promise<void> =>
      graphHost.recordBundleAndLayout());
  });

  test('GIVEN a target-like graph, a scripted 2 s pan uses under 1.5 s of main-thread CPU and no step over 50 ms', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the target-like state is sent', async (): Promise<void> => graphHost.sendState(targetLikeState()));

    await test.step('THEN the layout has finished', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('WHEN the graph is panned for 2 s after a 500 ms warm-up', async (): Promise<void> =>
      graphCanvas.scriptedPan(30, 120));

    await test.step('THEN the pan used under 1500 ms of CPU and no step over 50 ms', (): void =>
      graphCanvas.expectPanCpuUnder(1500, 50));
  });

  test('GIVEN 300 packages saved as grouped, the grouped layout lands in under 2 s, is cached, and a second open runs no layout', async ({
    graphGrouping,
    graphHost,
    graphLook,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened with a grouped view state', async (): Promise<void> =>
      graphPage.open({ savedState: groupedSavedState(largeState().hash) }));

    await test.step('AND the 300-package state is sent', async (): Promise<void> => graphHost.sendState(largeState()));

    await test.step('THEN the first frame came in under 2000 ms', async (): Promise<void> => graphLook.expectFirstFrameUnder(2000));

    await test.step('AND the layout is ELK and 30 boxes are drawn', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphGrouping.expectFolderCount(30);
    });

    await test.step('AND the grouped positions were posted', async (): Promise<void> => graphGrouping.expectPostedGrouping('folders'));

    const posted = await graphGrouping.postedPositions();
    const large = largeState();
    const folderCache: GraphReady = { ...large, folderPositions: posted };

    await test.step('WHEN the page is reopened with the saved view and the folders cache is sent', async (): Promise<void> => {
      await graphHost.expectViewSaved();
      await graphHost.reopen();
      await graphHost.sendState(folderCache);
    });

    await test.step('THEN the layout came from the cache and no worker was created', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('cache');
      await graphHost.expectWorkers(0);
    });
  });

  test('GIVEN 300 packages grouped and zoomed to readable boxes, a scripted 2 s pan uses under 1.5 s of main-thread CPU and no step over 50 ms', async ({
    graphCanvas,
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened with a grouped view state', async (): Promise<void> =>
      graphPage.open({ savedState: groupedSavedState(largeState().hash) }));

    await test.step('AND the 300-package state is sent', async (): Promise<void> => graphHost.sendState(largeState()));

    await test.step('THEN the grouped layout has finished', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphGrouping.expectFolderCount(30);
    });

    await test.step('WHEN the graph is zoomed until every box is at least 120 px wide', async (): Promise<void> => {
      await graphGrouping.zoomBoxesTo(120);
      await graphGrouping.expectBoxesAtLeast(120);
    });

    await test.step('AND it is panned for 2 s from a spot no box covers, after a 500 ms warm-up', async (): Promise<void> => {
      const spot = await graphGrouping.freeSpot();

      await graphCanvas.scriptedPan(30, 120, spot);
    });

    await test.step('THEN the pan used under 1500 ms of CPU and no step over 50 ms', (): void =>
      graphCanvas.expectPanCpuUnder(1500, 50));
  });

  test(
    'GIVEN 300 packages, the fastest of five controls builds and of five filter changes is under 50 ms',
    { annotation: AC6 },
    async ({ graphControls, graphPage, graphSamples }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND five 300-package graphs are sent, each under a hash that differs from the last', async (): Promise<void> =>
        graphSamples.collectControlsBuilt(BUILD_COUNTS));

      await test.step('THEN the fastest controls build was under 50 ms', (): void =>
        graphSamples.expectControlsBuiltMinUnder(BUDGET_MS));

      await test.step('WHEN the pkg-007 row is unchecked and checked in turn', async (): Promise<void> =>
        graphSamples.collectFilterApplied('pkg-007', LARGE_PACKAGE_COUNT, SAMPLES));

      await test.step('THEN the fastest filter change was applied in under 50 ms', (): void =>
        graphSamples.expectFilterAppliedMinUnder(BUDGET_MS));

      await test.step(`AND ${LAST_VISIBLE} of ${LARGE_PACKAGE_COUNT} packages are counted as visible`, async (): Promise<void> =>
        graphControls.expectCount(LAST_VISIBLE, LARGE_PACKAGE_COUNT));
    }
  );

  test(
    'GIVEN 300 packages on a hub, the fastest of five details builds is under 50 ms',
    { annotation: AC6 },
    async ({ graphDetails, graphHost, graphPage, graphSamples }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the hub graph is sent', async (): Promise<void> => graphHost.sendState(hubGraphState()));

      await test.step('AND pkg-000 is inspected five times', async (): Promise<void> => graphSamples.collectDetailsBuilt(SAMPLES));

      await test.step('THEN the fastest details build was under 50 ms', (): void =>
        graphSamples.expectDetailsBuiltMinUnder(BUDGET_MS));

      await test.step('AND pkg-000 lists 299 direct dependents', async (): Promise<void> =>
        graphDetails.expectNeighbourCount('Direct dependents', HUB_DEPENDENTS));
    }
  );

  test(
    'GIVEN a trace start on a 299-candidate hub, the fastest of five picking builds is under 50 ms',
    { annotation: AC6 },
    async ({ graphHost, graphPage, graphSamples, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the hub graph is sent', async (): Promise<void> => graphHost.sendState(hubGraphState()));

      await test.step('AND a trace is started from pkg-000 five times', async (): Promise<void> =>
        graphSamples.collectPickingBuilt(SAMPLES));

      await test.step('THEN the fastest picking build was under 50 ms', (): void =>
        graphSamples.expectPickingBuiltMinUnder(BUDGET_MS));

      await test.step('AND the picking view lists 299 dependents', async (): Promise<void> =>
        graphTrace.expectCandidateCount('backward', HUB_DEPENDENTS));
    }
  );

  test(
    'GIVEN a trace on the 300-package graph, the fastest of five is under 50 ms',
    { annotation: AC6 },
    async ({ graphHost, graphPage, graphSamples, graphTrace }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the 300-package graph is sent', async (): Promise<void> => graphHost.sendState(largeState()));

      await test.step('AND pkg-299 is traced to pkg-000 five times', async (): Promise<void> =>
        graphSamples.collectTraceBuilt(SAMPLES));

      await test.step('THEN the fastest trace was under 50 ms', (): void => graphSamples.expectTraceMinUnder(BUDGET_MS));

      await test.step('AND the trace is the seven-package shortest path', async (): Promise<void> =>
        graphTrace.expectTrace(PKG_299_TO_000_FACTS_STUB));
    }
  );
});
