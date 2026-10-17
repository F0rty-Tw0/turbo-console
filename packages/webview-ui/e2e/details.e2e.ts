import type { TaskDefinition } from '@turbo-console/core';

import { expect, test } from './details.fixture.ts';
import {
  HOSTILE_NAME_STUB,
  MISSING_PACKAGE_STUB,
  PACKAGE_DETAILS_STUB,
  RUN_VIEW_STUB,
  TASK_CARD_STUB,
  TASK_DEFINITION_STUB
} from './test/stubs/details-state.stub.ts';
import { packageWithTasks, taskNames } from './test/utils/details-state.spec.util.ts';
import type { WebviewMessage } from '../src/bridge/common/details-message.type.ts';
import type { PackageDetails, RunView, TaskCard } from '../src/bridge/common/details-state.type.ts';
import type { FieldRow } from '../src/details/common/details-page.type.ts';
import { RUN_SWAP_HOLD_MS } from '../src/details/common/run-view.const.ts';

const AC1 = { description: 'AC1', type: 'requirement' };
const AC4 = { description: 'AC4', type: 'requirement' };
const AC5 = { description: 'AC5', type: 'requirement' };

const NOT_IDLE: RunView = { ...RUN_VIEW_STUB, isIdle: false };

const RUNNING: RunView = { ...NOT_IDLE, iconId: 'sync', text: 'running', isRunning: true, elapsedMs: 0, isSpinning: true };

const PASSED: RunView = { ...NOT_IDLE, iconId: 'pass', colorVar: '--vscode-testing-iconPassed', text: 'passed' };

const HOSTILE_RUN: RunView = { ...NOT_IDLE, iconId: 'a b', colorVar: '--x) url(https://e/', text: 'hostile' };

const SAVED_SCROLL_Y = 300;

const FAR_SCROLL_Y = 1500;

const TASK_NAMES = taskNames(12);

const MANY_TASK_NAMES = taskNames(30);

const PENDING_CARD: TaskCard = { ...TASK_CARD_STUB, definition: null, cacheStatus: null };

const LOADING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, dryRun: 'loading', tasks: [PENDING_CARD] };

const SHORT_LOADING_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, dryRun: 'loading', tasks: [] };

const FOCUS_KEPT_LABELS = ['Refresh', 'Copy command for build'];

const CACHE_ONLY: TaskDefinition = { ...TASK_DEFINITION_STUB, persistent: false };

const PERSISTENT_ONLY: TaskDefinition = { ...TASK_DEFINITION_STUB, cache: false };

const NO_FLAGS: TaskDefinition = { ...TASK_DEFINITION_STUB, cache: false, persistent: false };

const BADGE_CASES: [string, TaskDefinition | null, string[]][] = [
  ['only cache set', CACHE_ONLY, ['Cacheable']],
  ['only persistent set', PERSISTENT_ONLY, ['Continuous']],
  ['neither flag set', NO_FLAGS, []],
  ['no definition yet', null, []]
];

const ALL_ACTIONS_POSTED: WebviewMessage[] = [
  { type: 'ready' },
  { type: 'run', taskId: 'web#build' },
  { type: 'stop', taskId: 'web#build' },
  { type: 'copy', taskId: 'web#build' },
  { type: 'refresh', scope: 'dryRun' },
  { type: 'openPackageJson' },
  { type: 'showOutput' }
];

const FULL_FIELDS: FieldRow[] = [
  ['Command', 'tsc -b'],
  ['Description', 'Builds the web app'],
  ['Cache', 'cached: will replay'],
  ['Inputs', 'src/**'],
  ['Outputs', 'dist/**'],
  ['Depends on', '^build'],
  ['Env', 'API_URL'],
  ['Dependents', 'docs#build']
];

test.describe('FEATURE: package details page', () => {
  test('GIVEN a full state, every header and card field renders', { annotation: AC1 }, async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('THEN the package name is the heading', async (): Promise<void> => expect(detailsPage.heading).toHaveText('web'));

    await test.step('AND the path renders', async (): Promise<void> => expect(detailsPage.path).toHaveText('apps/web'));

    await test.step('AND every tag renders', async (): Promise<void> =>
      expect(detailsPage.tags).toHaveText(['scope:web', 'type:app']));

    await test.step('AND every card field renders', async (): Promise<void> => detailsPage.card('build').expectFields(FULL_FIELDS));

    await test.step('AND both badges render', async (): Promise<void> =>
      detailsPage.card('build').expectBadges(['Cacheable', 'Continuous']));

    await test.step('AND no CSP violation is recorded', async (): Promise<void> => detailsPage.expectNoViolations());

    await test.step('AND no console or page error is logged', (): void => detailsPage.expectNoErrors());
  });

  for (const [given, definition, badges] of BADGE_CASES) {
    test(`GIVEN a task with ${given}, the card shows badges [${badges.join(', ')}]`, async ({ detailsPage }): Promise<void> => {
      const task: TaskCard = { ...TASK_CARD_STUB, definition };
      const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [task] };

      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

      await test.step('THEN exactly those badges render', async (): Promise<void> => detailsPage.card('build').expectBadges(badges));
    });
  }

  test(
    'GIVEN a package with a hostile name, the name renders as text',
    { annotation: AC5 },
    async ({ detailsPage }): Promise<void> => {
      const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, packageName: HOSTILE_NAME_STUB };

      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

      await test.step('THEN the heading text is the name', async (): Promise<void> =>
        expect(detailsPage.heading).toHaveText(HOSTILE_NAME_STUB));

      await test.step('AND no image element exists', async (): Promise<void> => expect(detailsPage.images).toHaveCount(0));

      await test.step('AND no CSP violation is recorded', async (): Promise<void> => detailsPage.expectNoViolations());
    }
  );

  test('GIVEN a task with a hostile name, the name renders as text', { annotation: AC5 }, async ({ detailsPage }): Promise<void> => {
    const card = detailsPage.card(HOSTILE_NAME_STUB);

    await test.step('WHEN the page shows the task', async (): Promise<void> =>
      detailsPage.open(packageWithTasks([HOSTILE_NAME_STUB])));

    await test.step('THEN the card title text is the name', async (): Promise<void> =>
      expect(card.title).toHaveText(HOSTILE_NAME_STUB));

    await test.step('AND the Run button label carries the name as text', async (): Promise<void> =>
      expect(card.runButton).toHaveAttribute('aria-label', `Run ${HOSTILE_NAME_STUB}`));

    await test.step('AND no image element exists', async (): Promise<void> => expect(detailsPage.images).toHaveCount(0));

    await test.step('AND no CSP violation is recorded', async (): Promise<void> => detailsPage.expectNoViolations());
  });

  test('GIVEN a runState with a theme color, the status icon takes it', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the task passes', async (): Promise<void> => detailsPage.sendRunState('web#build', PASSED));

    await test.step('THEN the icon is colored by the theme variable', async (): Promise<void> =>
      detailsPage.card('build').expectStatusIcon('codicon codicon-pass', 'var(--vscode-testing-iconPassed)'));

    await test.step('AND no CSP violation is recorded', async (): Promise<void> => detailsPage.expectNoViolations());
  });

  test('GIVEN a hostile icon id and color, the card renders without them', async ({ detailsPage }): Promise<void> => {
    const card = detailsPage.card('build');
    const task: TaskCard = { ...TASK_CARD_STUB, run: HOSTILE_RUN };
    const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [task] };

    await test.step('WHEN the page shows a card with the hostile run', async (): Promise<void> => detailsPage.open(state));

    await test.step('AND a runState repeats it', async (): Promise<void> => detailsPage.sendRunState('web#build', HOSTILE_RUN));

    await test.step('THEN the card shows the run text', async (): Promise<void> => expect(card.status).toHaveText('hostile'));

    await test.step('AND the icon has no class or color from them', async (): Promise<void> => card.expectStatusIcon('codicon', ''));

    await test.step('AND no console or page error is logged', (): void => detailsPage.expectNoErrors());
  });

  test('GIVEN a scroll position VS Code kept, the first state restores it', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the host kept a scroll position', async (): Promise<void> => detailsPage.restoreScroll(SAVED_SCROLL_Y));

    await test.step('AND the page shows twelve cards', async (): Promise<void> => detailsPage.open(packageWithTasks(TASK_NAMES)));

    await test.step('THEN the page is scrolled to the kept position', async (): Promise<void> =>
      detailsPage.expectScrollY(SAVED_SCROLL_Y));
  });

  test('GIVEN a scrolled page, a runState patches only its card', async ({ detailsPage }): Promise<void> => {
    const state = packageWithTasks(TASK_NAMES);
    const idleStatuses = new Array<string>(TASK_NAMES.length - 1).fill('');
    const statuses = [...idleStatuses, /^running · \d+s$/u];

    await test.step('WHEN the page shows twelve cards', async (): Promise<void> => detailsPage.open(state));

    await test.step('AND the page is scrolled to the bottom', async (): Promise<void> => detailsPage.scrollToBottom());

    await test.step('AND the last task starts running', async (): Promise<void> => detailsPage.sendRunState('web#t11', RUNNING));

    await test.step('THEN only the last card shows the running status', async (): Promise<void> =>
      expect(detailsPage.statuses).toHaveText(statuses));

    await test.step('AND the scroll position is kept', async (): Promise<void> => detailsPage.expectScrollKept());
  });

  test('GIVEN focus on a Run button, focus moves to Stop when the task runs', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the Run button is focused', async (): Promise<void> => detailsPage.focusButton('Run build'));

    await test.step('AND the task starts running', async (): Promise<void> => detailsPage.sendRunState('web#build', RUNNING));

    await test.step('THEN the Stop button has focus', async (): Promise<void> => detailsPage.expectFocused('Stop build'));
  });

  for (const label of FOCUS_KEPT_LABELS) {
    test(`GIVEN focus on ${label}, a new state keeps it there`, async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

      await test.step(`AND ${label} is focused`, async (): Promise<void> => detailsPage.focusButton(label));

      await test.step('AND the host posts a new state', async (): Promise<void> => detailsPage.sendState(PACKAGE_DETAILS_STUB));

      await test.step(`THEN ${label} still has focus`, async (): Promise<void> => detailsPage.expectFocused(label));
    });
  }

  test('GIVEN focus on Refresh, the package going missing moves focus to the page title', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND Refresh is focused', async (): Promise<void> => detailsPage.focusButton('Refresh'));

    await test.step('AND the package goes missing', async (): Promise<void> => detailsPage.sendState(MISSING_PACKAGE_STUB));

    await test.step('THEN the page title has focus', async (): Promise<void> => expect(detailsPage.heading).toBeFocused());
  });

  test('GIVEN every button, each click posts its message in order', async ({ detailsPage, pageClock }): Promise<void> => {
    const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, dryRun: 'failed' };

    await pageClock.install();

    await test.step('WHEN the page shows a state with a dry-run banner', async (): Promise<void> => detailsPage.open(state));

    await test.step('AND Run is clicked', async (): Promise<void> => detailsPage.pressButton('Run build'));

    await test.step('AND the task starts running', async (): Promise<void> => detailsPage.sendRunState('web#build', RUNNING));

    await test.step('AND Stop shows and its click hold passes', async (): Promise<void> => {
      await expect(detailsPage.card('build').runButton).toHaveAttribute('aria-label', 'Stop build');
      await pageClock.tick(RUN_SWAP_HOLD_MS);
    });

    await test.step('AND Stop is clicked', async (): Promise<void> => detailsPage.pressButton('Stop build'));

    await test.step('AND Copy is clicked', async (): Promise<void> => detailsPage.pressButton('Copy command for build'));

    await test.step('AND Refresh is clicked', async (): Promise<void> => detailsPage.pressButton('Refresh'));

    await test.step('AND Open package.json is clicked', async (): Promise<void> => detailsPage.pressButton('Open package.json'));

    await test.step('AND Show Output is clicked', async (): Promise<void> => detailsPage.pressButton('Show Output'));

    await test.step('THEN the posted messages are exactly those', async (): Promise<void> =>
      detailsPage.expectPosted(ALL_ACTIONS_POSTED));

    await test.step('AND the Copy button label names the task', async (): Promise<void> =>
      expect(detailsPage.card('build').copyButton).toHaveAttribute('aria-label', 'Copy command for build'));
  });

  test('GIVEN a dry run in flight, the card reads loading', async ({ detailsPage }): Promise<void> => {
    const rows: FieldRow[] = [
      ['Command', 'tsc -b'],
      ['Description', 'Builds the web app'],
      ['Definition', 'loading…'],
      ['Dependents', 'docs#build']
    ];

    await test.step('WHEN the page shows a loading state', async (): Promise<void> => detailsPage.open(LOADING_STATE));

    await test.step('THEN no banner shows', async (): Promise<void> => expect(detailsPage.banners).toHaveCount(0));

    await test.step('AND the definition reads loading…', async (): Promise<void> => detailsPage.card('build').expectFields(rows));
  });

  test('GIVEN a task with no command, the card says it runs its dependencies', async ({ detailsPage }): Promise<void> => {
    const card: TaskCard = { ...PENDING_CARD, command: null };
    const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [card] };
    const rows: FieldRow[] = [
      ['Command', 'none'],
      ['Description', 'Builds the web app'],
      ['Definition', 'No command (runs its dependencies)'],
      ['Dependents', 'docs#build']
    ];

    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

    await test.step('THEN the definition says the task runs its dependencies', async (): Promise<void> =>
      detailsPage.card('build').expectFields(rows));
  });

  test('GIVEN a kept scroll position and a short loading state first, the full state restores it', async ({
    detailsPage
  }): Promise<void> => {
    await test.step('WHEN the host kept a far scroll position', async (): Promise<void> => detailsPage.restoreScroll(FAR_SCROLL_Y));

    await test.step('AND the page first shows a short loading state', async (): Promise<void> =>
      detailsPage.open(SHORT_LOADING_STATE));

    await test.step('AND then thirty cards', async (): Promise<void> => detailsPage.sendState(packageWithTasks(MANY_TASK_NAMES)));

    await test.step('THEN the page is scrolled to the kept position', async (): Promise<void> =>
      detailsPage.expectScrollY(FAR_SCROLL_Y));
  });

  test('GIVEN a kept scroll position, a scroll during loading does not replace it', async ({ detailsPage }): Promise<void> => {
    const tallState = packageWithTasks(MANY_TASK_NAMES);
    const tallLoadingState: PackageDetails = { ...tallState, dryRun: 'loading' };

    await test.step('WHEN the host kept a far scroll position', async (): Promise<void> => detailsPage.restoreScroll(FAR_SCROLL_Y));

    await test.step('AND the page shows a tall loading state', async (): Promise<void> => detailsPage.open(tallLoadingState));

    await test.step('AND the page is scrolled to the bottom', async (): Promise<void> => detailsPage.scrollToBottom());

    await test.step('THEN the kept position is still saved', async (): Promise<void> => detailsPage.expectSavedScrollY(FAR_SCROLL_Y));
  });

  test('GIVEN reduced motion, a running task icon does not spin', async ({ detailsPage }): Promise<void> => {
    const card = detailsPage.card('build');

    await test.step('WHEN the OS asks for reduced motion', async (): Promise<void> => detailsPage.reduceMotion());

    await test.step('AND the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the task starts running', async (): Promise<void> => detailsPage.sendRunState('web#build', RUNNING));

    await test.step('THEN the icon has the spin class', async (): Promise<void> =>
      card.expectStatusIcon('codicon codicon-sync codicon-modifier-spin', ''));

    await test.step('AND it has no animation', async (): Promise<void> => card.expectIconAnimation('none'));
  });

  test(
    'GIVEN a failed dry run and a failed reload, both banners retry',
    { annotation: AC4 },
    async ({ detailsPage }): Promise<void> => {
      const reloadText = 'Showing cached data: reload failed. See Output.';
      const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, dryRun: 'failed', reloadError: reloadText };

      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

      await test.step('THEN the reload banner shows its text', async (): Promise<void> =>
        expect(detailsPage.reloadBanner).toContainText(reloadText));

      await test.step('AND the dry-run banner shows its text', async (): Promise<void> => {
        await expect(detailsPage.dryRunBanner).toContainText("Couldn't read the task details. See Output.");
      });

      await test.step('WHEN the reload banner Retry is clicked', async (): Promise<void> => detailsPage.retryReload());

      await test.step('THEN a root refresh is posted', async (): Promise<void> =>
        detailsPage.expectLastPosted({ type: 'refresh', scope: 'root' }));

      await test.step('WHEN the dry-run banner Retry is clicked', async (): Promise<void> => detailsPage.retryDryRun());

      await test.step('THEN a dry-run refresh is posted', async (): Promise<void> =>
        detailsPage.expectLastPosted({ type: 'refresh', scope: 'dryRun' }));
    }
  );

  test('GIVEN a package that goes missing and comes back, the notice replaces the cards and back', async ({
    detailsPage
  }): Promise<void> => {
    await test.step('WHEN the page shows the package', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the package goes missing', async (): Promise<void> => detailsPage.sendState(MISSING_PACKAGE_STUB));

    await test.step('THEN the missing notice is visible', async (): Promise<void> => expect(detailsPage.missingNotice).toBeVisible());

    await test.step('AND no card renders', async (): Promise<void> => expect(detailsPage.cards).toHaveCount(0));

    await test.step('WHEN the package comes back', async (): Promise<void> => detailsPage.sendState(PACKAGE_DETAILS_STUB));

    await test.step('THEN its card renders again', async (): Promise<void> => expect(detailsPage.cards).toHaveCount(1));

    await test.step('AND the notice is gone', async (): Promise<void> => expect(detailsPage.missingNotice).toHaveCount(0));
  });

  test('GIVEN a 400-character command at 320 px, the page never scrolls sideways', async ({ detailsPage }): Promise<void> => {
    const card: TaskCard = { ...TASK_CARD_STUB, command: 'x'.repeat(400) };
    const tasks = [card];
    const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks };

    await test.step('WHEN the page is 320 px wide', async (): Promise<void> => detailsPage.narrow(320));

    await test.step('AND the page shows the state', async (): Promise<void> => detailsPage.open(state));

    await test.step('THEN the page is no wider than the viewport', async (): Promise<void> =>
      detailsPage.expectNoHorizontalScroll(320));
  });

  test('GIVEN the codicon font under the webview CSP, it loads', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('THEN the codicon font is available', async (): Promise<void> => detailsPage.expectCodiconFont());

    await test.step('AND no CSP violation is recorded', async (): Promise<void> => detailsPage.expectNoViolations());
  });
});
