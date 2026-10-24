import { IS_MAC_RUNNER } from './common/graph.const.ts';
import { test } from './graph-task.fixture.ts';
import { targetLikeHubSavedState, targetLikeTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const AC8 = { description: 'M4-5a AC8', type: 'requirement' };

const SAVED_VIEW = targetLikeHubSavedState();

/**
 * The target-like package pan reads well under 1500 ms on Linux and Windows with the same 50 ms step line. No macOS
 * reading of the task pan exists yet (inferred, not measured): its budgets are the grouped pans' macOS ratio, about
 * 1.6x. Stopgap until the first CI baseline of the `graph task pan cpu target-like` bench row.
 */
const TASK_PAN_MS = IS_MAC_RUNNER ? 2400 : 1500;

const TASK_PAN_STEP_MS = IS_MAC_RUNNER ? 90 : 50;

// Tracing snapshots the DOM on every mouse move, on the page's main thread, and that CPU lands inside the measured pan.
test.use({ trace: 'off' });

test.describe('FEATURE: task graph tripwires', () => {
  test(
    'GIVEN one chosen task of a target-like state, the first frame lands under 2 s',
    { annotation: AC8 },
    async ({ graphHost, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened in task mode with the hub task chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_VIEW }));

      await test.step('AND the target-like state is sent', async (): Promise<void> => graphHost.sendState(targetLikeTasksState()));

      await test.step('THEN the first frame came in under 2000 ms', async (): Promise<void> => graphLook.expectFirstFrameUnder(2000));
    }
  );

  test(
    'GIVEN one chosen task of a target-like state framed by Fit, a scripted 2 s pan uses under 1.5 s of main-thread CPU (2.4 s on macOS) and no step over 50 ms (90 ms on macOS)',
    { annotation: AC8 },
    async ({ graphCanvas, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened in task mode with the hub task chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_VIEW }));

      await test.step('AND the target-like state is sent', async (): Promise<void> => graphHost.sendState(targetLikeTasksState()));

      await test.step('THEN the task layout has finished', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('WHEN Fit frames the graph, since the saved camera may look at an empty corner', async (): Promise<void> =>
        graphPage.pressButton(FIT_LABEL));

      await test.step('THEN every task is in view', async (): Promise<void> => graphCanvas.expectAllNodesInView());

      await test.step('WHEN the graph is panned for 2 s after a 500 ms warm-up', async (): Promise<void> =>
        graphCanvas.scriptedPan(30, 120));

      await test.step('THEN the pan stayed under the CPU and step budgets', (): void =>
        graphCanvas.expectPanCpuUnder(TASK_PAN_MS, TASK_PAN_STEP_MS));
    }
  );
});
