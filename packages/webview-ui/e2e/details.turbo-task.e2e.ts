import { expect, test } from './details.fixture.ts';
import { PACKAGE_DETAILS_STUB, TASK_CARD_STUB } from './test/stubs/details-state.stub.ts';
import type { PackageDetails, TaskCard } from '../src/bridge/common/details-state.type.ts';
import type { FieldRow } from '../src/details/common/details-page.type.ts';

const NOT_TURBO_CARD: TaskCard = { ...TASK_CARD_STUB, definition: null, cacheStatus: null, isTurboTask: false };

const READY_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, dryRun: 'ready', tasks: [NOT_TURBO_CARD] };

const LOADING_STATE: PackageDetails = { ...READY_STATE, dryRun: 'loading' };

const ROWS: FieldRow[] = [
  ['Command', 'tsc -b'],
  ['Description', 'Builds the web app'],
  ['Definition', 'Not a turbo task (no turbo.json entry)'],
  ['Dependents', 'docs#build']
];

const STATES: [string, PackageDetails][] = [
  ['ready', READY_STATE],
  ['loading', LOADING_STATE]
];

test.describe('FEATURE: package details page, a task turbo does not define', () => {
  for (const [phase, state] of STATES) {
    test(`GIVEN a task no turbo config defines and a ${phase} dry run, the card says it is not a turbo task`, async ({
      detailsPage
    }): Promise<void> => {
      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

      await test.step('THEN the definition says the task is not a turbo task', async (): Promise<void> =>
        detailsPage.card('build').expectFields(ROWS));

      await test.step('AND the card still offers its Run button', async (): Promise<void> =>
        expect(detailsPage.card('build').runButton).toBeVisible());
    });
  }
});
