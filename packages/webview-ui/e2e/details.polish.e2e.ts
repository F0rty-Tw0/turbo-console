import { expect, test } from './details.fixture.ts';
import { MISSING_PACKAGE_STUB, PACKAGE_DETAILS_STUB, RUN_VIEW_STUB, TASK_CARD_STUB } from './test/stubs/details-state.stub.ts';
import type { PackageDetails, RunView, TaskCard } from '../src/bridge/common/details-state.type.ts';

const AC1 = { description: 'AC1', type: 'requirement' };
const AC2 = { description: 'AC2', type: 'requirement' };

const RUNNING: RunView = { ...RUN_VIEW_STUB, iconId: 'sync', text: 'running', isRunning: true, elapsedMs: 0, isSpinning: true };

const RUNNING_FOR_59S: RunView = { ...RUNNING, elapsedMs: 59_000 };

const CONTINUOUS: RunView = { ...RUNNING, iconId: 'pulse', text: 'continuous', elapsedMs: 5000, isSpinning: false };

const PASSED_HIT: RunView = { ...RUN_VIEW_STUB, iconId: 'pass', colorVar: '--vscode-testing-iconPassed', text: '3.2s · cached' };

const RUNNING_CARD: TaskCard = { ...TASK_CARD_STUB, run: RUNNING };

const CONTINUOUS_CARD: TaskCard = { ...TASK_CARD_STUB, taskId: 'web#dev', name: 'dev', persistent: true, run: CONTINUOUS };

const RUNNING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [RUNNING_CARD] };

const CONTINUOUS_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [CONTINUOUS_CARD, RUNNING_CARD] };

test.describe('FEATURE: package details page, run clock and task kinds', () => {
  test(
    'GIVEN a running card, its clock ticks each second until the run ends',
    { annotation: AC1 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND the page shows a running card', async (): Promise<void> => detailsPage.open(RUNNING_STATE));

      await test.step('THEN the status reads running · 0s', async (): Promise<void> => expect(card.status).toHaveText('running · 0s'));

      await test.step('AND one interval is armed', async (): Promise<void> => pageClock.expectIntervals(1));

      await test.step('WHEN a second passes', async (): Promise<void> => pageClock.tick(1000));

      await test.step('THEN the status reads running · 1s', async (): Promise<void> => expect(card.status).toHaveText('running · 1s'));

      await test.step('WHEN another second passes', async (): Promise<void> => pageClock.tick(1000));

      await test.step('THEN the status reads running · 2s', async (): Promise<void> => expect(card.status).toHaveText('running · 2s'));

      await test.step('WHEN the run ends with a cache hit', async (): Promise<void> =>
        detailsPage.sendRunState('web#build', PASSED_HIT));

      await test.step('THEN the status reads the end text', async (): Promise<void> =>
        expect(card.status).toHaveText('3.2s · cached'));

      await test.step('AND no interval is left', async (): Promise<void> => pageClock.expectIntervals(0));

      await test.step('WHEN three more seconds pass', async (): Promise<void> => pageClock.tick(3000));

      await test.step('THEN the end text stays', async (): Promise<void> => expect(card.status).toHaveText('3.2s · cached'));
    }
  );

  test(
    'GIVEN a runState already 59 s in, the clock adds the page time to it',
    { annotation: AC1 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND the page shows an idle card', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

      await test.step('AND no interval is armed', async (): Promise<void> => pageClock.expectIntervals(0));

      await test.step('AND a runState 59 s into the run arrives', async (): Promise<void> =>
        detailsPage.sendRunState('web#build', RUNNING_FOR_59S));

      await test.step('THEN the status reads running · 59s', async (): Promise<void> =>
        expect(card.status).toHaveText('running · 59s'));

      await test.step('WHEN a second passes', async (): Promise<void> => pageClock.tick(1000));

      await test.step('THEN the status reads running · 1m 0s', async (): Promise<void> =>
        expect(card.status).toHaveText('running · 1m 0s'));

      await test.step('WHEN the package goes missing', async (): Promise<void> => detailsPage.sendState(MISSING_PACKAGE_STUB));

      await test.step('THEN no interval is left', async (): Promise<void> => pageClock.expectIntervals(0));
    }
  );

  test(
    'GIVEN a running continuous card, it reads continuous and its icon does not spin',
    { annotation: AC2 },
    async ({ detailsPage }): Promise<void> => {
      const continuous = detailsPage.card('dev');
      const plain = detailsPage.card('build');

      await test.step('WHEN the page shows a continuous and a plain running card', async (): Promise<void> =>
        detailsPage.open(CONTINUOUS_STATE));

      await test.step('THEN the continuous status reads continuous with its clock', async (): Promise<void> =>
        expect(continuous.status).toHaveText(/^continuous · \d+s$/u));

      await test.step('AND its pulse icon has no spin class', async (): Promise<void> =>
        continuous.expectStatusIcon('codicon codicon-pulse', ''));

      await test.step('AND the plain running icon spins', async (): Promise<void> =>
        plain.expectStatusIcon('codicon codicon-sync codicon-modifier-spin', ''));
    }
  );
});
