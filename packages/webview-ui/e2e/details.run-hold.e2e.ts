import { test } from './details.fixture.ts';
import { PACKAGE_DETAILS_STUB, RUN_VIEW_STUB, TASK_CARD_STUB } from './test/stubs/details-state.stub.ts';
import type { PackageDetails, RunView } from '../src/bridge/common/details-state.type.ts';
import { RUN_SWAP_HOLD_MS } from '../src/details/common/run-view.const.ts';

const AC6 = { description: 'AC6', type: 'requirement' };

const RUNNING: RunView = {
  ...RUN_VIEW_STUB,
  isIdle: false,
  iconId: 'sync',
  text: 'running',
  isRunning: true,
  elapsedMs: 0,
  isSpinning: true
};

test.describe('FEATURE: a Stop that replaces Run holds clicks', () => {
  test(
    'GIVEN an idle card, a second click right after its run starts does not stop it, one after the hold does',
    { annotation: AC6 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const { name, taskId } = TASK_CARD_STUB;
      const card = detailsPage.card(name);
      const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [TASK_CARD_STUB] };

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND shows the idle card', async (): Promise<void> => detailsPage.open(state));

      await test.step('AND its run starts', async (): Promise<void> => detailsPage.sendRunState(taskId, RUNNING));

      await test.step('AND Stop is clicked right away', async (): Promise<void> => card.runButton.click());

      await test.step('THEN that click posted nothing', async (): Promise<void> => detailsPage.expectPosted([{ type: 'ready' }]));

      await test.step('WHEN the hold ends', async (): Promise<void> => pageClock.tick(RUN_SWAP_HOLD_MS));

      await test.step('AND Stop is clicked', async (): Promise<void> => card.runButton.click());

      await test.step('THEN the page posts stop with its id', async (): Promise<void> =>
        detailsPage.expectLastPosted({ type: 'stop', taskId }));
    }
  );
});
