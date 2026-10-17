import { test } from './details.fixture.ts';
import { PACKAGE_DETAILS_STUB, RUN_VIEW_STUB, TASK_CARD_STUB } from './test/stubs/details-state.stub.ts';
import type { PackageDetails, RunView, TaskCard } from '../src/bridge/common/details-state.type.ts';
import { RUN_SWAP_HOLD_MS } from '../src/details/common/run-view.const.ts';

const AC6 = { description: 'AC6', type: 'requirement' };

const NOT_IDLE: RunView = { ...RUN_VIEW_STUB, isIdle: false };

const RUNNING: RunView = { ...NOT_IDLE, iconId: 'sync', text: 'running', isRunning: true, elapsedMs: 0, isSpinning: true };

const STOPPED: RunView = { ...NOT_IDLE, iconId: 'debug-stop', colorVar: '--vscode-disabledForeground', text: 'stopped · 3.0s' };

const RUNNING_CARD: TaskCard = { ...TASK_CARD_STUB, run: RUNNING };

const IDLE_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [TASK_CARD_STUB] };

const RUNNING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [RUNNING_CARD] };

/** The host's second runState for one Run (`processStarted`) lands this long after the first (`tryStart`). */
const SECOND_RUN_STATE_MS = 40;

/** A double-click's second click lands this long after the second runState. */
const SECOND_CLICK_MS = 100;

test.describe('FEATURE: a Stop that replaces Run holds clicks', () => {
  test(
    'GIVEN an idle card, a second click right after its run starts does not stop it, one after the hold does',
    { annotation: AC6 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const { name, taskId } = TASK_CARD_STUB;
      const card = detailsPage.card(name);

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND shows the idle card', async (): Promise<void> => detailsPage.open(IDLE_STATE));

      await test.step('AND its run starts', async (): Promise<void> => detailsPage.sendRunState(taskId, RUNNING));

      await test.step('AND Stop is clicked right away', async (): Promise<void> => card.runButton.click());

      await test.step('THEN that click posted nothing', async (): Promise<void> => detailsPage.expectPosted([{ type: 'ready' }]));

      await test.step('WHEN the hold ends', async (): Promise<void> => pageClock.tick(RUN_SWAP_HOLD_MS));

      await test.step('AND Stop is clicked', async (): Promise<void> => card.runButton.click());

      await test.step('THEN the page posts stop with its id', async (): Promise<void> =>
        detailsPage.expectLastPosted({ type: 'stop', taskId }));
    }
  );

  test(
    'GIVEN an idle card, a second running runState inside the hold keeps Stop held until the first swap’s hold ends',
    { annotation: AC6 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const { name, taskId } = TASK_CARD_STUB;
      const card = detailsPage.card(name);
      const runningLater: RunView = { ...RUNNING, elapsedMs: SECOND_RUN_STATE_MS };

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND shows the idle card', async (): Promise<void> => detailsPage.open(IDLE_STATE));

      await test.step('AND its run starts', async (): Promise<void> => detailsPage.sendRunState(taskId, RUNNING));

      await test.step('AND the host sends running again a moment later', async (): Promise<void> => {
        await pageClock.tick(SECOND_RUN_STATE_MS);
        await detailsPage.sendRunState(taskId, runningLater);
      });

      await test.step('AND Stop is clicked as a double-click’s second click', async (): Promise<void> => {
        await pageClock.tick(SECOND_CLICK_MS);
        await card.runButton.click();
      });

      await test.step('THEN that click posted nothing', async (): Promise<void> => detailsPage.expectPosted([{ type: 'ready' }]));

      await test.step('WHEN the hold from the swap ends', async (): Promise<void> =>
        pageClock.tick(RUN_SWAP_HOLD_MS - SECOND_RUN_STATE_MS - SECOND_CLICK_MS));

      await test.step('AND Stop is clicked', async (): Promise<void> => card.runButton.click());

      await test.step('THEN the page posts stop with its id', async (): Promise<void> =>
        detailsPage.expectLastPosted({ type: 'stop', taskId }));
    }
  );

  test(
    'GIVEN a Stop past its hold, a running runState that swaps nothing does not hold it again',
    { annotation: AC6 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const { name, taskId } = TASK_CARD_STUB;
      const card = detailsPage.card(name);
      const runningLater: RunView = { ...RUNNING, elapsedMs: RUN_SWAP_HOLD_MS + SECOND_CLICK_MS };

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND shows the idle card', async (): Promise<void> => detailsPage.open(IDLE_STATE));

      await test.step('AND its run starts', async (): Promise<void> => detailsPage.sendRunState(taskId, RUNNING));

      await test.step('AND the hold passes', async (): Promise<void> => pageClock.tick(RUN_SWAP_HOLD_MS + SECOND_CLICK_MS));

      await test.step('AND a running tick arrives', async (): Promise<void> => detailsPage.sendRunState(taskId, runningLater));

      await test.step('AND Stop is clicked right away', async (): Promise<void> => card.runButton.click());

      await test.step('THEN the page posts stop with its id', async (): Promise<void> =>
        detailsPage.expectLastPosted({ type: 'stop', taskId }));
    }
  );

  test(
    'GIVEN focus on Stop and a held Enter, a key repeat after the hold still does not relaunch the stopped run',
    { annotation: AC6 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const { name, taskId } = RUNNING_CARD;
      const card = detailsPage.card(name);

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND shows the running card', async (): Promise<void> => detailsPage.open(RUNNING_STATE));

      await test.step('AND its Stop button is focused', async (): Promise<void> => detailsPage.focusButton(`Stop ${name}`));

      await test.step('AND Enter goes down on it and stays held', async (): Promise<void> => card.holdEnter());

      await test.step('AND the run ends stopped', async (): Promise<void> => detailsPage.sendRunState(taskId, STOPPED));

      await test.step('AND Enter repeats after the hold', async (): Promise<void> => {
        await pageClock.tick(RUN_SWAP_HOLD_MS + SECOND_CLICK_MS);
        await card.repeatEnter();
      });

      await test.step('THEN the Run button has focus', async (): Promise<void> => detailsPage.expectFocused(`Run ${name}`));

      await test.step('AND the page posted stop only', async (): Promise<void> =>
        detailsPage.expectPosted([{ type: 'ready' }, { type: 'stop', taskId }]));
    }
  );
});
