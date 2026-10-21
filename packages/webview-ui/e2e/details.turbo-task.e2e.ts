import { expect, test } from './details.fixture.ts';
import { SCRIPT_TERMS } from './test/common/details.const.ts';
import { PACKAGE_DETAILS_STUB, TASK_CARD_STUB } from './test/stubs/details-state.stub.ts';
import type { PackageDetails, TaskCard } from '../src/bridge/common/details-state.type.ts';

const SCRIPT_CARD: TaskCard = {
  ...TASK_CARD_STUB,
  definition: null,
  cacheStatus: null,
  isTurboTask: false,
  runCommand: 'pnpm run build'
};

const READY_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, dryRun: 'ready', tasks: [SCRIPT_CARD] };

const LOADING_STATE: PackageDetails = { ...READY_STATE, dryRun: 'loading' };

const STATES: [string, PackageDetails][] = [
  ['ready', READY_STATE],
  ['loading', LOADING_STATE]
];

test.describe('FEATURE: package details page, a task turbo does not define', () => {
  for (const [phase, state] of STATES) {
    test(`GIVEN a script no turbo config defines and a ${phase} dry run, the card shows its run command and no definition`, async ({
      detailsPage
    }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

      await test.step('THEN the run command shows in its block', async (): Promise<void> =>
        expect(card.commandBlock('Run command')).toHaveText('pnpm run build'));

      await test.step('AND the facts are the script body and Dependents, with no definition row', async (): Promise<void> =>
        card.expectFields(SCRIPT_TERMS));

      await test.step('AND the Script fact is the body as code', async (): Promise<void> =>
        card.expectFact('Script', 'code', 'tsc -b'));

      await test.step('AND the description shows under the title', async (): Promise<void> =>
        card.expectDescription('Builds the web app'));

      await test.step('AND the card offers Run', async (): Promise<void> =>
        expect(card.runButton).toHaveAttribute('aria-label', 'Run build'));

      await test.step('AND the card offers Copy', async (): Promise<void> =>
        expect(card.copyButton).toHaveAttribute('aria-label', 'Copy command for build'));
    });
  }
});
