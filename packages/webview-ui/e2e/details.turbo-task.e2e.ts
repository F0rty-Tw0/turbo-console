import { expect, test } from './details.fixture.ts';
import { PACKAGE_DETAILS_STUB, TASK_CARD_STUB } from './test/stubs/details-state.stub.ts';
import type { PackageDetails, TaskCard } from '../src/bridge/common/details-state.type.ts';
import type { FieldRow } from '../src/details/common/details-page.type.ts';

const SCRIPT_CARD: TaskCard = {
  ...TASK_CARD_STUB,
  definition: null,
  cacheStatus: null,
  isTurboTask: false,
  runCommand: 'pnpm run build'
};

const READY_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, dryRun: 'ready', tasks: [SCRIPT_CARD] };

const LOADING_STATE: PackageDetails = { ...READY_STATE, dryRun: 'loading' };

const ROWS: FieldRow[] = [
  ['Command', 'pnpm run build'],
  ['Script', 'tsc -b'],
  ['Description', 'Builds the web app'],
  ['Dependents', 'docs#build']
];

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

      await test.step('THEN the fields are the run command and the script body, with no definition row', async (): Promise<void> =>
        card.expectFields(ROWS));

      await test.step('AND the card offers Run', async (): Promise<void> =>
        expect(card.runButton).toHaveAttribute('aria-label', 'Run build'));

      await test.step('AND the card offers Copy', async (): Promise<void> =>
        expect(card.copyButton).toHaveAttribute('aria-label', 'Copy command for build'));
    });
  }
});
