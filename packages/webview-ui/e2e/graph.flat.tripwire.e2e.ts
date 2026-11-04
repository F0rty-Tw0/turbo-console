import { FLAT_FIRST_FRAME_MS } from './common/graph-tripwire.const.ts';
import { test } from './graph-task.fixture.ts';
import { uncachedLargeState } from './test/utils/graph-large.spec.util.ts';
import { ELK_THOROUGH_MAX_LEAVES } from '../src/graph/common/graph-layout.const.ts';

// Tracing snapshots the DOM on the page's main thread, and that CPU lands inside the measured first frame.
test.use({ trace: 'off' });

test.describe('FEATURE: flat graph tripwires', () => {
  // 150 leaves are the widest graph the layered search runs at thoroughness 7, about 2.5x the cost of 151 leaves.
  test('GIVEN 150 packages with no cached layout, laid out flat, the first frame lands under 2 s', async ({
    graphHost,
    graphLook,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the 150-package state with no cached positions is sent', async (): Promise<void> =>
      graphHost.sendState(uncachedLargeState(ELK_THOROUGH_MAX_LEAVES)));

    await test.step('THEN ELK laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('AND the first frame came in under 2000 ms', async (): Promise<void> =>
      graphLook.expectFirstFrameUnder(FLAT_FIRST_FRAME_MS));
  });
});
