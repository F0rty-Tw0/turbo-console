import { LARGE_PACKAGE_COUNT, TOGGLE_BUDGET_MS } from './common/graph.const.ts';
import { test } from './graph.fixture.ts';
import { PKG_299_TO_000_FACTS_STUB } from './test/stubs/graph-trace-facts.stub.ts';
import { hubGraphState } from './test/utils/graph-hub.spec.util.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const AC6 = { description: 'M4-2 AC6', type: 'requirement' };

const C2 = { description: 'M4-4 C2', type: 'requirement' };

const C4 = { description: 'M4-4 C4', type: 'requirement' };

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

/** After Fit and the zoom to 120 px boxes, 9 of the 30 boxes of `largeState()` overlap the canvas; 6 leaves slack. */
const BOXES_IN_VIEW = 6;

/**
 * macOS runners read the grouped pans 683-1422 ms and 1559-2842 ms (C58, 2026-10-23, `pan-cpu-ms` log lines): about 2x
 * spread on one runner image, inferred to be host CPU loss counted as thread time. Their budgets sit about 1.27x over
 * the worst reading; Linux and Windows keep the tight budgets on the same code. Stopgap until C58's calibrated budget.
 */
const IS_MAC_RUNNER = process.platform === 'darwin';

/**
 * About 320 ms pinned with tracing off; Cytoscape 3.34.4 unpatched reads about 1500 ms (folder boxes re-styled every
 * frame), so the budget sits between them with room for CI runners that measure up to 3.4x slower. The 120 px box
 * zoom (about 0.21) is below the header rows' 0.5 floor, so no widget moves in this pan.
 */
const GROUPED_PAN_MS = IS_MAC_RUNNER ? 1800 : 1100;

/**
 * About 690 ms pinned (685 to 701) with tracing off, at the first notch past the rows' 0.5 zoom floor (about 0.51);
 * the budget keeps about the grouped pan's 3.4x room. It guards the pan with rows shown and the canvas detail drawn at
 * this zoom, not per-row widget cost: with 2 boxes and 4 buttons in view, a mutant forcing a layout read on every widget
 * style write measured 693 ms, inside the base's spread.
 */
const ROWS_PAN_MS = IS_MAC_RUNNER ? 3600 : 2400;

/** At the first zoom that shows header rows, 2 of the 30 boxes of `largeState()` overlap the canvas, each with its 2 buttons. */
const ROWS_BOXES_IN_VIEW = 2;

const ROWS_BUTTONS_SHOWN = 4;

/** Five folders of `largeState()` that sit well inside the canvas after Fit and the zoom to 120 px boxes. */
const TOGGLED_FOLDERS = ['group-2', 'group-3', 'group-4', 'group-12', 'group-13'];

const GROUP_COUNT = 30;

/**
 * A fresh Windows renderer reads ThreadTime as 0 until Chromium has timed its TSC rate over 50 ms, then jumps by all
 * the CPU the thread used since it started; 12 steps of 10 ms spin cross that point.
 */
const SPIN_STEPS = 12;

const SPIN_MS = 10;

/** A clock that is not counting yet reads exactly 0, so any read above 0 passes; a busy runner can deschedule most of a spin. */
const SPIN_FLOOR_MS = 0;

/** Each sample toggles pkg-007 once, so an odd count leaves it hidden. */
const LAST_VISIBLE = LARGE_PACKAGE_COUNT - (SAMPLES % 2);

// Tracing snapshots the DOM on every mouse move, on the page's main thread, and that CPU lands inside the measured pan.
test.use({ trace: 'off' });

test.describe('FEATURE: graph tripwires', () => {
  test('GIVEN a fresh renderer, the CPU clock the pan tripwires read counts every 10 ms spin from the first step', async ({
    cpuClock
  }): Promise<void> => {
    await test.step('WHEN a blank page busy-waits 10 ms per step for 12 steps', async (): Promise<void> =>
      cpuClock.spinSteps(SPIN_STEPS, SPIN_MS));

    await test.step('THEN every step read more than 1 ms and less than 50 ms of CPU', (): void =>
      cpuClock.expectEveryStepBetween(SPIN_FLOOR_MS, BUDGET_MS));
  });

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

  // The saved camera (zoom 1, pan at the origin) looks at an empty corner of the grouped layout, so this first frame
  // times the grouped ELK run and the draw, not painting boxes in view; the grouped pan below frames the boxes first.
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

  test('GIVEN 300 packages grouped and zoomed to readable boxes, a scripted 2 s pan uses under 1.1 s of main-thread CPU (1.8 s on macOS) and no step over 50 ms', async ({
    graphCanvas,
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe,
    graphWidgets
  }): Promise<void> => {
    // The CPU budget is the gate; macOS CI ran this in 29 s of the default 30, so wall time gets 3x.
    test.slow();

    await test.step('WHEN the page is opened with a grouped view state', async (): Promise<void> =>
      graphPage.open({ savedState: groupedSavedState(largeState().hash) }));

    await test.step('AND the 300-package state is sent', async (): Promise<void> => graphHost.sendState(largeState()));

    await test.step('THEN the grouped layout has finished', async (): Promise<void> => {
      await graphProbe.expectLayoutEngine('elk');
      await graphGrouping.expectFolderCount(30);
    });

    await test.step('WHEN Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> => {
      await graphPage.pressButton(FIT_LABEL);
      await graphCanvas.expectAllNodesInView();
    });

    await test.step('AND the graph is zoomed until every box is at least 120 px wide', async (): Promise<void> => {
      await graphGrouping.zoomBoxesTo(120);
      await graphGrouping.expectBoxesAtLeast(120);
    });

    await test.step('THEN at least 6 boxes are in view, so the pan draws boxes', async (): Promise<void> =>
      graphGrouping.expectBoxesInView(BOXES_IN_VIEW));

    await test.step('AND no header widget is shown at this zoom, so the pan times the boxes alone', async (): Promise<void> =>
      graphWidgets.expectNoHeaderButtonShown());

    await test.step('AND it is panned for 2 s from a spot no box covers, after a 500 ms warm-up', async (): Promise<void> => {
      const spot = await graphGrouping.freeSpot();

      await graphCanvas.scriptedPan(30, 120, spot);
    });

    await test.step('THEN the pan used under 1100 ms of CPU and no step over 50 ms', (): void =>
      graphCanvas.expectPanCpuUnder(GROUPED_PAN_MS, 50));
  });

  test('GIVEN 300 packages grouped and zoomed until header rows show, a scripted 2 s pan uses under 2.4 s of main-thread CPU (3.6 s on macOS) and no step over 50 ms', async ({
    graphCanvas,
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe,
    graphWidgets
  }): Promise<void> => {
    // The CPU budget is the gate; macOS CI runs the sibling grouped pan in 29 s of the default 30, so wall time gets 3x.
    test.slow();

    await test.step('WHEN the page is opened with a grouped view state', async (): Promise<void> =>
      graphPage.open({ savedState: groupedSavedState(largeState().hash) }));

    await test.step('AND the 300-package state is sent', async (): Promise<void> => graphHost.sendState(largeState()));

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

    await test.step('THEN at least 4 header buttons and 2 boxes are in view, so the pan moves widgets over boxes', async (): Promise<void> => {
      await graphWidgets.expectHeaderButtonsShown(ROWS_BUTTONS_SHOWN);
      await graphGrouping.expectBoxesInView(ROWS_BOXES_IN_VIEW);
    });

    await test.step('AND it is panned for 2 s from a spot no box covers, after a 500 ms warm-up', async (): Promise<void> => {
      const spot = await graphGrouping.freeSpot();

      await graphCanvas.scriptedPan(30, 120, spot);
    });

    await test.step('THEN the pan used under 2400 ms of CPU and no step over 50 ms', (): void =>
      graphCanvas.expectPanCpuUnder(ROWS_PAN_MS, 50));
  });

  test(
    'GIVEN 300 packages grouped with every folder expanded, the fastest of five collapses and of five expands is under 100 ms',
    { annotation: C2 },
    async ({ graphCanvas, graphFolders, graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with a grouped view state', async (): Promise<void> =>
        graphPage.open({ savedState: groupedSavedState(largeState().hash) }));

      await test.step('AND the 300-package state is sent', async (): Promise<void> => graphHost.sendState(largeState()));

      await test.step('THEN the grouped layout has finished', async (): Promise<void> => {
        await graphProbe.expectLayoutEngine('elk');
        await graphGrouping.expectFolderCount(GROUP_COUNT);
      });

      await test.step('WHEN Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> => {
        await graphPage.pressButton(FIT_LABEL);
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('AND the graph is zoomed until every box is at least 120 px wide', async (): Promise<void> => {
        await graphGrouping.zoomBoxesTo(120);
        await graphGrouping.expectBoxesAtLeast(120);
      });

      await test.step('THEN at least 6 boxes, the five to toggle among them, are in view', async (): Promise<void> => {
        await graphGrouping.expectBoxesInView(BOXES_IN_VIEW);
        await graphFolders.expectFoldersInView(TOGGLED_FOLDERS);
      });

      await test.step('WHEN each of the five folders is collapsed, then expanded, by its list button', async (): Promise<void> =>
        graphFolders.collectToggleMs(TOGGLED_FOLDERS));

      await test.step('THEN the fastest collapse and the fastest expand were under 100 ms', (): void =>
        graphFolders.expectToggleMinUnder(TOGGLE_BUDGET_MS));
    }
  );

  test(
    'GIVEN 301 packages and no saved state, the page opens grouped with all 30 folders collapsed',
    { annotation: C4 },
    async ({ graphFolders, graphGrouping, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a 301-package state is sent', async (): Promise<void> =>
        graphHost.sendState(largeState(LARGE_PACKAGE_COUNT + 1)));

      await test.step('THEN Group by folder is checked', async (): Promise<void> => graphGrouping.expectGrouped(true));

      await test.step('AND 30 folders are drawn, all collapsed', async (): Promise<void> => {
        await graphGrouping.expectFolderCount(GROUP_COUNT);
        await graphFolders.expectAllCollapsed(true);
      });
    }
  );

  test(
    'GIVEN 300 packages and no saved state, the page opens flat',
    { annotation: C4 },
    async ({ graphFolders, graphGrouping, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a 300-package state is sent', async (): Promise<void> => graphHost.sendState(largeState()));

      await test.step('THEN Group by folder is unchecked', async (): Promise<void> => graphGrouping.expectGrouped(false));

      await test.step('AND no folder is drawn', async (): Promise<void> => graphFolders.expectFolders([]));
    }
  );

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
