import { expect, test } from './details.fixture.ts';
import { CONTINUOUS_CHIP, SCRIPT_TERMS } from './test/common/details.const.ts';
import {
  MISSING_PACKAGE_STUB,
  PACKAGE_DETAILS_STUB,
  PASSED_RUN_VIEW_STUB,
  RUNNING_RUN_VIEW_STUB,
  RUN_VIEW_STUB,
  STOPPED_RUN_VIEW_STUB,
  TASK_CARD_STUB
} from './test/stubs/details-state.stub.ts';
import type { CacheStatus, PackageDetails, RunView, TaskCard } from '../src/bridge/common/details-state.type.ts';

const AC1 = { description: 'AC1', type: 'requirement' };
const AC2 = { description: 'AC2', type: 'requirement' };
const AC4 = { description: 'AC4', type: 'requirement' };
const AC7 = { description: 'AC7', type: 'requirement' };
const AC9 = { description: 'AC9', type: 'requirement' };

const RUNNING_FOR_59S: RunView = { ...RUNNING_RUN_VIEW_STUB, elapsedMs: 59_000 };

const CONTINUOUS: RunView = { ...RUNNING_RUN_VIEW_STUB, iconId: 'pulse', text: 'continuous', elapsedMs: 5000, isSpinning: false };

const PASSED_HIT: RunView = { ...PASSED_RUN_VIEW_STUB, text: '3.2s · cached' };

const RUNNING_CARD: TaskCard = { ...TASK_CARD_STUB, run: RUNNING_RUN_VIEW_STUB };

const CONTINUOUS_CARD: TaskCard = { ...TASK_CARD_STUB, taskId: 'web#dev', name: 'dev', persistent: true, run: CONTINUOUS };

const SCRIPT_CARD: TaskCard = {
  ...TASK_CARD_STUB,
  definition: null,
  cacheStatus: null,
  isTurboTask: false,
  runCommand: 'pnpm run build'
};

const RUNNING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [RUNNING_CARD] };

const CONTINUOUS_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [CONTINUOUS_CARD, RUNNING_CARD] };

const CONTINUOUS_PENDING_CARD: TaskCard = { ...CONTINUOUS_CARD, definition: null, cacheStatus: null };

const CONTINUOUS_LOADING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, dryRun: 'loading', tasks: [CONTINUOUS_PENDING_CARD] };

const SCRIPT_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [SCRIPT_CARD] };

const SCRIPT_RUNNING_CARD: TaskCard = { ...SCRIPT_CARD, run: RUNNING_RUN_VIEW_STUB };

const SCRIPT_RUNNING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [SCRIPT_RUNNING_CARD] };

const FORMAT_RUNNING_CARD: TaskCard = { ...SCRIPT_RUNNING_CARD, taskId: 'web#format', name: 'format' };

const MIXED_RUNNING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [TASK_CARD_STUB, FORMAT_RUNNING_CARD] };

const EMPTY_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [] };

const IDLE_CONTINUOUS_RUN: RunView = { ...RUN_VIEW_STUB, iconId: 'server-process', text: 'continuous' };

const IDLE_CONTINUOUS_CARD: TaskCard = { ...CONTINUOUS_CARD, run: IDLE_CONTINUOUS_RUN };

const IDLE_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [TASK_CARD_STUB, IDLE_CONTINUOUS_CARD] };

const PASSED_VAR = '--vscode-testing-iconPassed';

const RUNNING_VAR = '--vscode-progressBar-background';

const CACHE_CASES: [CacheStatus, string][] = [
  ['HIT', 'cached: will replay'],
  ['MISS', 'not cached: will run'],
  ['deferred', 'unknown: decided at run time']
];

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
    async ({ detailsPage, pageClock }): Promise<void> => {
      const continuous = detailsPage.card('dev');
      const plain = detailsPage.card('build');

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND the page shows a continuous and a plain running card', async (): Promise<void> =>
        detailsPage.open(CONTINUOUS_STATE));

      await test.step('THEN the continuous status reads continuous with its clock', async (): Promise<void> =>
        expect(continuous.status).toHaveText(/^continuous · \d+s$/u));

      await test.step('AND both clocks share one interval', async (): Promise<void> => pageClock.expectIntervals(1));

      await test.step('AND its pulse icon has no spin class', async (): Promise<void> =>
        continuous.expectStatusIcon('codicon codicon-pulse', ''));

      await test.step('AND the plain running icon spins', async (): Promise<void> =>
        plain.expectStatusIcon('codicon codicon-sync codicon-modifier-spin', ''));

      await test.step('AND the continuous card has the one Continuous chip', async (): Promise<void> =>
        continuous.expectChips([CONTINUOUS_CHIP]));

      await test.step('AND the plain card, whose dry run says persistent, has the same chip', async (): Promise<void> =>
        plain.expectChips([CONTINUOUS_CHIP]));
    }
  );

  test(
    'GIVEN a continuous card and a loading dry run, the Continuous chip shows alone',
    { annotation: AC2 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the loading state', async (): Promise<void> => detailsPage.open(CONTINUOUS_LOADING_STATE));

      await test.step('THEN the chips hold only the Continuous chip', async (): Promise<void> =>
        detailsPage.card('dev').expectChips([CONTINUOUS_CHIP]));
    }
  );

  test(
    'GIVEN an idle script card, it offers Run and Copy, a blank status and its script facts',
    { annotation: AC9 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page shows the idle card', async (): Promise<void> => detailsPage.open(SCRIPT_STATE));

      await test.step('THEN the card offers Run', async (): Promise<void> =>
        expect(card.runButton).toHaveAttribute('aria-label', 'Run build'));

      await test.step('AND Copy', async (): Promise<void> =>
        expect(card.copyButton).toHaveAttribute('aria-label', 'Copy command for build'));

      await test.step('AND a blank status line', async (): Promise<void> => card.expectBlankStatus());

      await test.step('AND the run command in its block', async (): Promise<void> =>
        expect(card.commandBlock('Run command')).toHaveText('pnpm run build'));

      await test.step('AND the Script and Dependents facts', async (): Promise<void> => card.expectFields(SCRIPT_TERMS));

      await test.step('AND the Script fact is the body as code', async (): Promise<void> =>
        card.expectFact('Script', 'code', 'tsc -b'));

      await test.step('WHEN its run starts', async (): Promise<void> => detailsPage.sendRunState('web#build', RUNNING_RUN_VIEW_STUB));

      await test.step('THEN the status shows the run', async (): Promise<void> => expect(card.status).toHaveText(/^running · \d+s$/u));

      await test.step('AND the card offers Stop', async (): Promise<void> =>
        expect(card.runButton).toHaveAttribute('aria-label', 'Stop build'));

      await test.step('AND keeps Copy', async (): Promise<void> => expect(card.copyButton).toHaveCount(1));

      await test.step('WHEN the run ends stopped', async (): Promise<void> =>
        detailsPage.sendRunState('web#build', STOPPED_RUN_VIEW_STUB));

      await test.step('THEN the status shows the end state', async (): Promise<void> =>
        expect(card.status).toHaveText('stopped · 3.0s'));

      await test.step('AND the card offers Run again', async (): Promise<void> =>
        expect(card.runButton).toHaveAttribute('aria-label', 'Run build'));
    }
  );

  test(
    'GIVEN a running script card, an idle view blanks its status, stops its clock and offers Run',
    { annotation: AC9 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND the page shows the running card', async (): Promise<void> => detailsPage.open(SCRIPT_RUNNING_STATE));

      await test.step('AND one interval is armed', async (): Promise<void> => pageClock.expectIntervals(1));

      await test.step('AND an idle view arrives', async (): Promise<void> => detailsPage.sendRunState('web#build', RUN_VIEW_STUB));

      await test.step('THEN the status is blank', async (): Promise<void> => card.expectBlankStatus());

      await test.step('AND no interval is left', async (): Promise<void> => pageClock.expectIntervals(0));

      await test.step('AND the card offers Run', async (): Promise<void> =>
        expect(card.runButton).toHaveAttribute('aria-label', 'Run build'));
    }
  );

  test(
    'GIVEN focus on Stop of a script card, focus moves to its Run button when the run ends',
    { annotation: AC9 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the running card', async (): Promise<void> => detailsPage.open(SCRIPT_RUNNING_STATE));

      await test.step('AND its Stop button is focused', async (): Promise<void> => detailsPage.focusButton('Stop build'));

      await test.step('AND the run ends stopped', async (): Promise<void> =>
        detailsPage.sendRunState('web#build', STOPPED_RUN_VIEW_STUB));

      await test.step('THEN the Run button has focus', async (): Promise<void> => detailsPage.expectFocused('Run build'));
    }
  );

  test(
    'GIVEN focus elsewhere on the page, a script card whose run ends leaves the focus where it is',
    { annotation: AC9 },
    async ({ detailsPage }): Promise<void> => {
      const copyButton = detailsPage.card('build').copyButton;

      await test.step('WHEN the page shows a turbo card and a running script card', async (): Promise<void> =>
        detailsPage.open(MIXED_RUNNING_STATE));

      await test.step('AND the turbo card Copy button is focused', async (): Promise<void> => copyButton.focus());

      await test.step('AND the script run ends stopped', async (): Promise<void> =>
        detailsPage.sendRunState('web#format', STOPPED_RUN_VIEW_STUB));

      await test.step('THEN Copy keeps the focus', async (): Promise<void> => expect(copyButton).toBeFocused());
    }
  );

  test(
    'GIVEN an idle turbo card and an idle continuous card, both show a blank status',
    { annotation: AC1 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows both idle cards', async (): Promise<void> => detailsPage.open(IDLE_STATE));

      await test.step('THEN the turbo card status is blank', async (): Promise<void> => detailsPage.card('build').expectBlankStatus());

      await test.step('AND the continuous card status is blank', async (): Promise<void> =>
        detailsPage.card('dev').expectBlankStatus());
    }
  );

  test(
    'GIVEN a card whose run changes, its status color follows the run',
    { annotation: AC1 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page shows the idle card', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

      await test.step('THEN the card has no status color', async (): Promise<void> => card.expectStatusColor(null));

      await test.step('WHEN the task runs', async (): Promise<void> => detailsPage.sendRunState('web#build', RUNNING_RUN_VIEW_STUB));

      await test.step('THEN the status color is the progress bar variable', async (): Promise<void> =>
        card.expectStatusColor(RUNNING_VAR));

      await test.step('WHEN the task passes', async (): Promise<void> => detailsPage.sendRunState('web#build', PASSED_HIT));

      await test.step('THEN the status color is the passed variable', async (): Promise<void> => card.expectStatusColor(PASSED_VAR));

      await test.step('WHEN the run goes back to idle', async (): Promise<void> =>
        detailsPage.sendRunState('web#build', RUN_VIEW_STUB));

      await test.step('THEN the card has no status color again', async (): Promise<void> => card.expectStatusColor(null));
    }
  );

  test(
    'GIVEN a Run button, it reads Run, and Stop reads Stop once the task runs',
    { annotation: AC1 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page shows the idle card', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

      await test.step('THEN Run build shows the text Run', async (): Promise<void> => card.expectButtonText('Run build', 'Run'));

      await test.step('WHEN the task runs', async (): Promise<void> => detailsPage.sendRunState('web#build', RUNNING_RUN_VIEW_STUB));

      await test.step('THEN Stop build shows the text Stop', async (): Promise<void> => card.expectButtonText('Stop build', 'Stop'));
    }
  );

  test(
    'GIVEN a running card, its run text carries the clock text as its tooltip',
    { annotation: AC1 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND the page shows a running card', async (): Promise<void> => detailsPage.open(RUNNING_STATE));

      await test.step('AND a second passes', async (): Promise<void> => pageClock.tick(1000));

      await test.step('THEN the tooltip equals the text running · 1s', async (): Promise<void> =>
        card.expectRunTextTooltip('running · 1s'));
    }
  );

  test(
    'GIVEN a running card, a full state keeps its status color and tooltip',
    { annotation: AC1 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND the page shows a running card', async (): Promise<void> => detailsPage.open(RUNNING_STATE));

      await test.step('AND the host posts the whole state again', async (): Promise<void> => detailsPage.sendState(RUNNING_STATE));

      await test.step('THEN the status color is still the progress bar variable', async (): Promise<void> =>
        card.expectStatusColor(RUNNING_VAR));

      await test.step('AND the run text still has its tooltip', async (): Promise<void> => card.expectRunTextTooltip('running · 0s'));
    }
  );

  for (const [cacheStatus, cacheText] of CACHE_CASES) {
    test(
      `GIVEN a dry-run cache status ${cacheStatus}, the Cache fact reads ${cacheText}`,
      { annotation: AC7 },
      async ({ detailsPage }): Promise<void> => {
        const task: TaskCard = { ...TASK_CARD_STUB, cacheStatus };
        const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [task] };

        await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

        await test.step('THEN the Cache fact reads the new text', async (): Promise<void> =>
          detailsPage.card('build').expectFact('Cache', 'plain', cacheText));
      }
    );
  }

  test(
    'GIVEN a package with no tasks, the page says so in place of the cards',
    { annotation: AC4 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(EMPTY_STATE));

      await test.step('THEN the no-tasks text shows', async (): Promise<void> =>
        expect(detailsPage.noCardsNotice).toHaveText('No tasks in this package.'));

      await test.step('AND no card renders', async (): Promise<void> => expect(detailsPage.cards).toHaveCount(0));
    }
  );
});
