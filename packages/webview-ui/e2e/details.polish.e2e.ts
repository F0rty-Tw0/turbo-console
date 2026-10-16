import { expect, test } from './details.fixture.ts';
import { MISSING_PACKAGE_STUB, PACKAGE_DETAILS_STUB, RUN_VIEW_STUB, TASK_CARD_STUB } from './test/stubs/details-state.stub.ts';
import type { CacheStatus, PackageDetails, RunView, TaskCard } from '../src/bridge/common/details-state.type.ts';
import type { FieldRow } from '../src/details/common/details-page.type.ts';

const AC1 = { description: 'AC1', type: 'requirement' };
const AC2 = { description: 'AC2', type: 'requirement' };
const AC4 = { description: 'AC4', type: 'requirement' };
const AC7 = { description: 'AC7', type: 'requirement' };
const AC9 = { description: 'AC9', type: 'requirement' };

const NOT_IDLE: RunView = { ...RUN_VIEW_STUB, isIdle: false };

const RUNNING: RunView = { ...NOT_IDLE, iconId: 'sync', text: 'running', isRunning: true, elapsedMs: 0, isSpinning: true };

const RUNNING_FOR_59S: RunView = { ...RUNNING, elapsedMs: 59_000 };

const CONTINUOUS: RunView = { ...RUNNING, iconId: 'pulse', text: 'continuous', elapsedMs: 5000, isSpinning: false };

const PASSED_HIT: RunView = { ...NOT_IDLE, iconId: 'pass', colorVar: '--vscode-testing-iconPassed', text: '3.2s · cached' };

const STOPPED: RunView = { ...NOT_IDLE, iconId: 'debug-stop', colorVar: '--vscode-disabledForeground', text: 'stopped · 3.0s' };

const NOT_TURBO_IDLE: RunView = { ...RUN_VIEW_STUB, colorVar: '--vscode-disabledForeground', text: 'not a turbo task' };

const RUNNING_CARD: TaskCard = { ...TASK_CARD_STUB, run: RUNNING };

const CONTINUOUS_CARD: TaskCard = { ...TASK_CARD_STUB, taskId: 'web#dev', name: 'dev', persistent: true, run: CONTINUOUS };

const NOT_TURBO_CARD: TaskCard = {
  ...TASK_CARD_STUB,
  definition: null,
  cacheStatus: null,
  isTurboTask: false,
  run: NOT_TURBO_IDLE
};

const RUNNING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [RUNNING_CARD] };

const CONTINUOUS_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [CONTINUOUS_CARD, RUNNING_CARD] };

const CONTINUOUS_PENDING_CARD: TaskCard = { ...CONTINUOUS_CARD, definition: null, cacheStatus: null };

const CONTINUOUS_LOADING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, dryRun: 'loading', tasks: [CONTINUOUS_PENDING_CARD] };

const NOT_TURBO_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [NOT_TURBO_CARD] };

const NOT_TURBO_RUNNING_CARD: TaskCard = { ...NOT_TURBO_CARD, run: RUNNING };

const NOT_TURBO_RUNNING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [NOT_TURBO_RUNNING_CARD] };

const EMPTY_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [] };

const NOT_TURBO_ROWS: FieldRow[] = [
  ['Command', 'tsc -b'],
  ['Description', 'Builds the web app'],
  ['Definition', 'Not a turbo task: no turbo.json defines it'],
  ['Dependents', 'docs#build']
];

const CACHE_CASES: [CacheStatus, string][] = [
  ['HIT', 'cached: will replay'],
  ['MISS', 'not cached: will run'],
  ['deferred', 'unknown: decided at run time']
];

const cacheRows = (cacheText: string): FieldRow[] => {
  const rows: FieldRow[] = [
    ['Command', 'tsc -b'],
    ['Description', 'Builds the web app'],
    ['Cache', cacheText],
    ['Inputs', 'src/**'],
    ['Outputs', 'dist/**'],
    ['Depends on', '^build'],
    ['Env', 'API_URL'],
    ['Dependents', 'docs#build']
  ];

  return rows;
};

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

      await test.step('AND runs until stopped follows the badges', async (): Promise<void> =>
        continuous.expectBadgeRow(['Cacheable', 'Continuous', 'runs until stopped']));

      await test.step('AND the plain card has no such text', async (): Promise<void> =>
        plain.expectBadgeRow(['Cacheable', 'Continuous']));
    }
  );

  test(
    'GIVEN a continuous card and a loading dry run, runs until stopped shows alone',
    { annotation: AC2 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the loading state', async (): Promise<void> => detailsPage.open(CONTINUOUS_LOADING_STATE));

      await test.step('THEN the badge row holds only runs until stopped', async (): Promise<void> =>
        detailsPage.card('dev').expectBadgeRow(['runs until stopped']));
    }
  );

  test(
    'GIVEN a task no turbo config defines, the card offers no Run or Copy and a blank status',
    { annotation: AC9 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page shows the idle card', async (): Promise<void> => detailsPage.open(NOT_TURBO_STATE));

      await test.step('THEN the card has no Run button', async (): Promise<void> => expect(card.runButton).toHaveCount(0));

      await test.step('AND no Copy button', async (): Promise<void> => expect(card.copyButton).toHaveCount(0));

      await test.step('AND a blank status line', async (): Promise<void> => card.expectBlankStatus());

      await test.step('AND the not-turbo text', async (): Promise<void> => card.expectFields(NOT_TURBO_ROWS));

      await test.step('WHEN a run on it is still live', async (): Promise<void> => detailsPage.sendRunState('web#build', RUNNING));

      await test.step('THEN the status shows the run', async (): Promise<void> => expect(card.status).toHaveText(/^running · \d+s$/u));

      await test.step('AND the card offers Stop', async (): Promise<void> =>
        expect(card.runButton).toHaveAttribute('aria-label', 'Stop build'));

      await test.step('AND still no Copy button', async (): Promise<void> => expect(card.copyButton).toHaveCount(0));

      await test.step('WHEN the run ends stopped', async (): Promise<void> => detailsPage.sendRunState('web#build', STOPPED));

      await test.step('THEN the status shows the end state', async (): Promise<void> =>
        expect(card.status).toHaveText('stopped · 3.0s'));

      await test.step('AND the card has no Run button', async (): Promise<void> => expect(card.runButton).toHaveCount(0));
    }
  );

  test(
    'GIVEN a running card no turbo config defines, an idle view blanks it and stops its clock',
    { annotation: AC9 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND the page shows the running card', async (): Promise<void> => detailsPage.open(NOT_TURBO_RUNNING_STATE));

      await test.step('AND one interval is armed', async (): Promise<void> => pageClock.expectIntervals(1));

      await test.step('AND an idle view arrives', async (): Promise<void> => detailsPage.sendRunState('web#build', NOT_TURBO_IDLE));

      await test.step('THEN the status is blank', async (): Promise<void> => card.expectBlankStatus());

      await test.step('AND no interval is left', async (): Promise<void> => pageClock.expectIntervals(0));
    }
  );

  for (const [cacheStatus, cacheText] of CACHE_CASES) {
    test(
      `GIVEN a dry-run cache status ${cacheStatus}, the Cache field reads ${cacheText}`,
      { annotation: AC7 },
      async ({ detailsPage }): Promise<void> => {
        const task: TaskCard = { ...TASK_CARD_STUB, cacheStatus };
        const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [task] };

        await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

        await test.step('THEN the Cache field reads the new text', async (): Promise<void> =>
          detailsPage.card('build').expectFields(cacheRows(cacheText)));
      }
    );
  }

  test(
    'GIVEN a package with no tasks, the page says so in place of the cards',
    { annotation: AC4 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(EMPTY_STATE));

      await test.step('THEN the no-tasks text shows', async (): Promise<void> => expect(detailsPage.noTasksNotice).toBeVisible());

      await test.step('AND no card renders', async (): Promise<void> => expect(detailsPage.cards).toHaveCount(0));
    }
  );
});
