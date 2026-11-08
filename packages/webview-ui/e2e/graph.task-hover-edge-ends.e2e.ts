import { expect, test } from './graph-task.fixture.ts';
import { dirtyEdgeEndsNow } from './test/utils/graph-edge-ends.spec.util.ts';
import {
  TARGET_LIKE_HUB_TASK,
  targetLikeHubSavedState,
  targetLikeTasksState
} from './test/utils/graph-target-like-tasks.spec.util.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const HOVER_FLOW = { description: 'M4-5a spec 6.8', type: 'requirement' };

const SAVED_VIEW = targetLikeHubSavedState();

test.describe('FEATURE: task graph hover edge ends', () => {
  test(
    'GIVEN the hub task of a target-like state framed by Fit, hovering it leaves no node whose edges Cytoscape keeps dirty, so the flow overlay reads their ends without recomputing them each frame',
    { annotation: HOVER_FLOW },
    async ({ graphCanvas, graphHost, graphHover, graphPage, graphProbe, page }): Promise<void> => {
      const dirtyEdgeEnds = async (): Promise<string[]> => page.evaluate(dirtyEdgeEndsNow);

      await test.step('WHEN the page is opened in task mode with the hub task chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_VIEW }));

      await test.step('AND the target-like state is sent', async (): Promise<void> => graphHost.sendState(targetLikeTasksState()));

      await test.step('THEN the task layout has finished', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('WHEN Fit frames the graph, since the saved camera may look at an empty corner', async (): Promise<void> =>
        graphPage.pressButton(FIT_LABEL));

      await test.step('THEN every shown task is in view, so the hover lights tasks the page draws', async (): Promise<void> =>
        graphCanvas.expectAllNodesInView());

      await test.step('WHEN the hub task is hovered', async (): Promise<void> => graphHover.overNode(TARGET_LIKE_HUB_TASK));

      await test.step('THEN its chain edges are lit, so the flow overlay reads their ends', async (): Promise<void> =>
        graphHover.expectLitEdges());

      await test.step('AND Cytoscape flushes every node it queued, so none keeps its edges dirty', async (): Promise<void> =>
        expect.poll(dirtyEdgeEnds).toEqual([]));
    }
  );
});
