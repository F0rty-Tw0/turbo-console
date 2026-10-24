import { IS_MAC_RUNNER } from './common/graph.const.ts';
import { test } from './graph-task.fixture.ts';
import {
  TARGET_LIKE_HUB_TASK,
  targetLikeHubSavedState,
  targetLikeTasksState
} from './test/utils/graph-target-like-tasks.spec.util.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const HOVER_FLOW = { description: 'M4-5a spec 6.8', type: 'requirement' };

const SAVED_VIEW = targetLikeHubSavedState();

const HOVER_MS = 3000;

/**
 * About 509 ms pinned (498 to 513) with tracing off; the budget keeps the pans' 3.4x room for slower CI runners, and
 * macOS gets 4.4x as a stopgap until its first CI reading (C58). It catches main-thread work several times the flow's,
 * not one extra Cytoscape draw a frame: a mutant forcing a render every frame read about 877 ms and a style update
 * every frame about 1030 ms, both inside it, so the render count below guards that.
 */
const HOVER_FLOW_MS = IS_MAC_RUNNER ? 2240 : 1731;

/** The hover's slowest step read 4 ms pinned, so Linux and Windows get the 50 ms long-task line; macOS read up to 52 ms on the pans' steps (C58), so it gets the pans' 90 ms. */
const HOVER_STEP_MS = IS_MAC_RUNNER ? 90 : 50;

/**
 * Cytoscape `render` events during the 3 s hover: the flow overlay exists so Cytoscape never redraws while the dashes
 * move. The base reads 0 over about 188 frames (3 runs); a mutant forcing `cy.forceRender()` in `viewport` every frame
 * reads about 376. Host-independent, unlike the CPU budget, which that mutant (about 877 ms pinned) stays inside.
 */
const RENDER_LIMIT = 2;

// Tracing snapshots the DOM on every mouse move, on the page's main thread, and that CPU lands inside the measured hover.
test.use({ trace: 'off' });

test.describe('FEATURE: task graph hover-flow tripwire', () => {
  test(
    'GIVEN the hub task of a target-like state framed by Fit, a 3 s hover with the pointer moving every frame uses under its main-thread CPU and step budgets',
    { annotation: HOVER_FLOW },
    async ({ graphCanvas, graphFlow, graphHost, graphHover, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened in task mode with the hub task chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_VIEW }));

      await test.step('AND the target-like state is sent', async (): Promise<void> => graphHost.sendState(targetLikeTasksState()));

      await test.step('THEN the task layout has finished', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('WHEN Fit frames the graph, since the saved camera may look at an empty corner', async (): Promise<void> =>
        graphPage.pressButton(FIT_LABEL));

      await test.step('THEN every shown task is in view, so the hover lights tasks the page draws', async (): Promise<void> =>
        graphCanvas.expectAllNodesInView());

      await test.step('WHEN the hub task is hovered', async (): Promise<void> => graphHover.overNode(TARGET_LIKE_HUB_TASK));

      await test.step('THEN its chain edges are lit and the flow overlay is drawing them', async (): Promise<void> => {
        await graphHover.expectLitEdges();
        await graphFlow.expectInked(true);
      });

      await test.step('WHEN the pointer moves 1 px every frame on the hub task for 3 s', async (): Promise<void> =>
        graphHover.hoverFlowCpu(TARGET_LIKE_HUB_TASK, HOVER_MS));

      await test.step('THEN the flow overlay was still drawing at the end, so the run measured a live flow', async (): Promise<void> =>
        graphFlow.expectInked(true));

      await test.step('AND the hover stayed under the CPU and step budgets', (): void =>
        graphHover.expectHoverCpuUnder(HOVER_FLOW_MS, HOVER_STEP_MS));

      await test.step(`AND Cytoscape drew at most ${RENDER_LIMIT} frames, so the flow stayed on its overlay`, (): void =>
        graphHover.expectHoverRendersAtMost(RENDER_LIMIT));
    }
  );
});
