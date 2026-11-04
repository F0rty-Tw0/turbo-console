import { IS_MAC_RUNNER } from './common/graph.const.ts';
import type { QuietWindow } from './common/graph.type.ts';
import { test } from './graph-task.fixture.ts';
import {
  TARGET_LIKE_HUB_TASK,
  targetLikeHubSavedState,
  targetLikeTasksState
} from './test/utils/graph-target-like-tasks.spec.util.ts';
import { FLOW_IDLE_MS } from '../src/graph/common/flow.const.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const HOVER_FLOW = { description: 'M4-5a spec 6.8', type: 'requirement' };

const SAVED_VIEW = targetLikeHubSavedState();

/** Sizes the run: `hoverFlowCpu` takes one step per 16 ms of it, so 3000 gives 188 steps, each about two frames, about 6 s in all. */
const HOVER_STEP_SPAN_MS = 3000;

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
 * Cytoscape `render` events during the 188-step hover (about 6 s): the flow overlay exists so Cytoscape never redraws
 * while the dashes move. The measure starts after `HOVER_LAYER_WINDOW_MS` and `HOVER_QUIET_WINDOW`: the hover-enter paint,
 * the forced redraw that builds the lit layers and the late texture redraws Cytoscape fires after it and the Fit land in
 * those waits, not in the count; slow macOS runners drew one stray render inside the measure, which set off the chain of
 * three and read up to 4. The base reads 0 over the 188 steps (3 runs); a mutant forcing `cy.forceRender()` once inside
 * the measure reads at most 2, and one forcing it in `viewport` every frame reads about 376, two a step.
 * Host-independent, unlike the CPU budget, which that mutant (about 877 ms pinned) stays inside.
 */
const RENDER_LIMIT = 2;

/**
 * The hover-enter paint is a style change, which invalidates Cytoscape's layered texture cache; the cache draws directly
 * for 250 ms (`invalidThreshold`) and nothing redraws after that, so the layers of the lit style stay unbuilt and the
 * first render of any kind later queues a layer and sets off the chain of three (the render, the debounced dequeue, the
 * refine). The hover therefore waits 300 ms, past that 250 ms, and forces the one render that starts the chain inside
 * `HOVER_QUIET_WINDOW`, not inside the measure.
 */
const HOVER_LAYER_WINDOW_MS = 300;

/**
 * Cytoscape's late refine lands 230 to 330 ms after a style or viewport change, past the shared 250 ms quiet window, so
 * the hover waits for 500 ms of no render: the 330 ms gap plus headroom for a slow host. `FLOW_IDLE_MS` runs from the
 * hover-enter and the still pointer does not re-arm it, so the wait gives up 1000 ms before it and lowers that by
 * `HOVER_LAYER_WINDOW_MS`, which has already passed when the wait starts: the flow overlay is still drawing when the
 * measure starts.
 */
const HOVER_QUIET_WINDOW: QuietWindow = { quietMs: 500, timeoutMs: FLOW_IDLE_MS - 1000 - HOVER_LAYER_WINDOW_MS };

// Tracing snapshots the DOM on every mouse move, on the page's main thread, and that CPU lands inside the measured hover.
test.use({ trace: 'off' });

test.describe('FEATURE: task graph hover-flow tripwire', () => {
  test(
    'GIVEN the hub task of a target-like state framed by Fit, a 188-step hover (about 6 s) with the pointer moving every step uses under its main-thread CPU and step budgets',
    { annotation: HOVER_FLOW },
    async ({ graphCanvas, graphFlow, graphHost, graphHover, graphPage, graphPointer, graphProbe }): Promise<void> => {
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

      await test.step('AND the lit style is redrawn once past the texture cache window, so its layers are built before the measure', async (): Promise<void> =>
        graphHover.redrawAfter(HOVER_LAYER_WINDOW_MS));

      await test.step('AND the canvas is quiet, so late redraws of the Fit and the hover-enter paint are not counted', async (): Promise<void> =>
        graphPointer.waitForQuietCanvas(HOVER_QUIET_WINDOW));

      await test.step('WHEN the pointer moves 1 px every step on the hub task for 188 steps, about 6 s', async (): Promise<void> =>
        graphHover.hoverFlowCpu(TARGET_LIKE_HUB_TASK, HOVER_STEP_SPAN_MS));

      await test.step('THEN the flow overlay was still drawing at the end, so the run measured a live flow', async (): Promise<void> =>
        graphFlow.expectInked(true));

      await test.step('AND the hover stayed under the CPU and step budgets', (): void =>
        graphHover.expectHoverCpuUnder(HOVER_FLOW_MS, HOVER_STEP_MS));

      await test.step(`AND Cytoscape rendered at most ${RENDER_LIMIT} times, so the flow stayed on its overlay`, (): void =>
        graphHover.expectHoverRendersAtMost(RENDER_LIMIT));
    }
  );
});
