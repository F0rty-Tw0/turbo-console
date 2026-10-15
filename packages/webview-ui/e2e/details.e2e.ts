import { expect, test } from './details.fixture.ts';
import { MISSING_PACKAGE_STUB, PACKAGE_DETAILS_STUB, RUN_VIEW_STUB, TASK_CARD_STUB } from './test/stubs/details-state.stub.ts';
import { packageWithTasks } from './test/utils/details-state.spec.util.ts';
import type { MissingPackage, PackageDetails, RunView, TaskCard } from '../src/bridge/common/details-state.type.ts';
import type { FieldRow } from '../src/details/common/details-page.type.ts';

const AC1 = { description: 'AC1', type: 'requirement' };
const AC4 = { description: 'AC4', type: 'requirement' };
const AC5 = { description: 'AC5', type: 'requirement' };

const HOSTILE_NAME = '<img src=x onerror=alert(1)>';

const RUNNING: RunView = { ...RUN_VIEW_STUB, iconId: 'sync', text: 'running…', isRunning: true };

const PASSED: RunView = { ...RUN_VIEW_STUB, iconId: 'pass', colorVar: '--vscode-testing-iconPassed', text: 'passed' };

const HOSTILE_RUN: RunView = { ...RUN_VIEW_STUB, iconId: 'a b', colorVar: '--x) url(https://e/', text: 'hostile' };

const SAVED_SCROLL_Y = 300;

const TASK_NAMES = ['t00', 't01', 't02', 't03', 't04', 't05', 't06', 't07', 't08', 't09', 't10', 't11'];

const FULL_FIELDS: FieldRow[] = [
  ['Command', 'tsc -b'],
  ['Description', 'Builds the web app'],
  ['Cache', 'hit'],
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

  test(
    'GIVEN a package with a hostile name, the name renders as text',
    { annotation: AC5 },
    async ({ detailsPage }): Promise<void> => {
      const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, packageName: HOSTILE_NAME };

      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

      await test.step('THEN the heading text is the name', async (): Promise<void> =>
        expect(detailsPage.heading).toHaveText(HOSTILE_NAME));

      await test.step('AND no image element exists', async (): Promise<void> => expect(detailsPage.images).toHaveCount(0));

      await test.step('AND no CSP violation is recorded', async (): Promise<void> => detailsPage.expectNoViolations());
    }
  );

  test('GIVEN a task with a hostile name, the name renders as text', { annotation: AC5 }, async ({ detailsPage }): Promise<void> => {
    const card = detailsPage.card(HOSTILE_NAME);

    await test.step('WHEN the page shows the task', async (): Promise<void> => detailsPage.open(packageWithTasks([HOSTILE_NAME])));

    await test.step('THEN the card title text is the name', async (): Promise<void> => expect(card.title).toHaveText(HOSTILE_NAME));

    await test.step('AND the Run button label carries the name as text', async (): Promise<void> =>
      expect(card.runButton).toHaveAttribute('aria-label', `Run ${HOSTILE_NAME}`));

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
    const statuses = [...idleStatuses, 'running…'];

    await test.step('WHEN the page shows twelve cards', async (): Promise<void> => detailsPage.open(state));

    await test.step('AND the page is scrolled to the bottom', async (): Promise<void> => detailsPage.scrollToBottom());

    await test.step('AND the last task starts running', async (): Promise<void> => detailsPage.sendRunState('web#t11', RUNNING));

    await test.step('THEN only the last card shows the running status', async (): Promise<void> =>
      expect(detailsPage.statuses).toHaveText(statuses));

    await test.step('AND the scroll position is kept', async (): Promise<void> => detailsPage.expectScrollKept());
  });

  test('GIVEN focus on a Run button, focus moves to Stop when the task runs', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the Run button is focused', async (): Promise<void> => detailsPage.focusRun('build'));

    await test.step('AND the task starts running', async (): Promise<void> => detailsPage.sendRunState('web#build', RUNNING));

    await test.step('THEN the Stop button has focus', async (): Promise<void> => detailsPage.expectStopFocused('build'));
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

  test('GIVEN a missing package, the notice replaces the cards', async ({ detailsPage }): Promise<void> => {
    const state: MissingPackage = MISSING_PACKAGE_STUB;

    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(state));

    await test.step('THEN the missing notice is visible', async (): Promise<void> => expect(detailsPage.missingNotice).toBeVisible());

    await test.step('AND no card renders', async (): Promise<void> => expect(detailsPage.cards).toHaveCount(0));
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
