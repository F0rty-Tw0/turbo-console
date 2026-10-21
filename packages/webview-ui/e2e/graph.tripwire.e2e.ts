import { LARGE_PACKAGE_COUNT } from './common/graph.const.ts';
import { test } from './graph.fixture.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';

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
});
