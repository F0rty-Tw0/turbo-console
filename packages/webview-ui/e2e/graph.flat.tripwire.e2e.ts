import { IS_WINDOWS_RUNNER } from './common/graph.const.ts';
import { test } from './graph-task.fixture.ts';
import { uncachedLargeState } from './test/utils/graph-large.spec.util.ts';
import { ELK_THOROUGH_MAX_LEAVES } from '../src/graph/common/graph-layout.const.ts';

/** Mostly the ELK run at thoroughness 7; Windows gets 3 s like the grouped 300 cold open (see `IS_WINDOWS_RUNNER`). */
const THOROUGH_FIRST_FRAME_MS = IS_WINDOWS_RUNNER ? 3000 : 2000;

// Tracing snapshots the DOM on the page's main thread, and that CPU lands inside the measured first frame.
test.use({ trace: 'off' });

test.describe('FEATURE: flat graph tripwires', () => {
  // 100 leaves are the widest graph the layered search runs at thoroughness 7 (150 took 2269 ms on the ubuntu runner).
  test('GIVEN 100 packages with no cached layout, laid out flat, the first frame lands within its budget', async ({
    graphHost,
    graphLook,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the 100-package state with no cached positions is sent', async (): Promise<void> =>
      graphHost.sendState(uncachedLargeState(ELK_THOROUGH_MAX_LEAVES)));

    await test.step('THEN ELK laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step(`AND the first frame came in under ${THOROUGH_FIRST_FRAME_MS} ms`, async (): Promise<void> =>
      graphLook.expectFirstFrameUnder(THOROUGH_FIRST_FRAME_MS));
  });
});
