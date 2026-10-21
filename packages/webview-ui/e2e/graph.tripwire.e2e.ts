import { test } from './graph.fixture.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';

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

  test('GIVEN a target-like graph, a scripted 2 s pan has at most one long task and none over 200 ms', async ({
    graphCanvas,
    graphHost,
    graphLook,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the target-like state is sent', async (): Promise<void> => graphHost.sendState(targetLikeState()));

    await test.step('AND the layout has finished', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('AND the graph is panned for 2 s after a 500 ms warm-up', async (): Promise<void> =>
      graphCanvas.scriptedPan(30, 120));

    await test.step('THEN at most one long task and none over 200 ms ran', async (): Promise<void> =>
      graphLook.expectLongTasks(1, 200));
  });
});
