import { expect, test } from './details.fixture.ts';
import { HOSTILE_NAME_STUB, PACKAGE_DETAILS_STUB, RUN_VIEW_STUB, TASK_CARD_STUB } from './test/stubs/details-state.stub.ts';
import type { PackageDetails, RunView, TaskCard } from '../src/bridge/common/details-state.type.ts';
import type { FieldRow } from '../src/details/common/details-page.type.ts';
import { STOP_TO_RUN_HOLD_MS } from '../src/details/common/run-view.const.ts';

const AC6 = { description: 'AC6', type: 'requirement' };

const NOT_IDLE: RunView = { ...RUN_VIEW_STUB, isIdle: false };

const RUNNING: RunView = { ...NOT_IDLE, iconId: 'sync', text: 'running', isRunning: true, elapsedMs: 0, isSpinning: true };

const STOPPED: RunView = { ...NOT_IDLE, iconId: 'debug-stop', colorVar: '--vscode-disabledForeground', text: 'stopped · 3.0s' };

const TEST_CARD: TaskCard = { ...TASK_CARD_STUB, taskId: 'web#test', name: 'test' };

const SCRIPT_CARD: TaskCard = {
  ...TASK_CARD_STUB,
  taskId: 'web#lint',
  name: 'lint',
  command: 'eslint .',
  description: null,
  dependents: [],
  definition: null,
  cacheStatus: null,
  isTurboTask: false,
  runCommand: 'pnpm run lint'
};

const REFUSED_CARD: TaskCard = { ...SCRIPT_CARD, taskId: 'web#a b', name: 'a b', runCommand: null };

const MIXED_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [TASK_CARD_STUB, SCRIPT_CARD, TEST_CARD] };

const SCRIPTS_ONLY_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [SCRIPT_CARD] };

const REFUSED_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [REFUSED_CARD] };

const HIDDEN_TURBO_STATE: PackageDetails = {
  ...PACKAGE_DETAILS_STUB,
  tasks: [TASK_CARD_STUB, TEST_CARD],
  scriptsShown: false,
  hiddenScriptCount: 3
};

const HIDDEN_EMPTY_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [], scriptsShown: false, hiddenScriptCount: 3 };

const HIDDEN_NONE_STATE: PackageDetails = { ...HIDDEN_EMPTY_STATE, hiddenScriptCount: 0 };

const KEPT_SCRIPT_CARD: TaskCard = { ...SCRIPT_CARD, run: RUNNING };

const HIDDEN_KEPT_STATE: PackageDetails = {
  ...PACKAGE_DETAILS_STUB,
  tasks: [KEPT_SCRIPT_CARD],
  scriptsShown: false,
  hiddenScriptCount: 2
};

const HIDDEN_DROPPED_STATE: PackageDetails = { ...HIDDEN_KEPT_STATE, tasks: [] };

const TURBO_RUNNING_CARD: TaskCard = { ...TASK_CARD_STUB, run: RUNNING };

const MULTI_LINE_CARD: TaskCard = { ...SCRIPT_CARD, command: 'eslint .\n--fix' };

const MULTI_LINE_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [MULTI_LINE_CARD] };

const HOSTILE_SCRIPT_CARD: TaskCard = {
  ...SCRIPT_CARD,
  taskId: `web#${HOSTILE_NAME_STUB}`,
  name: HOSTILE_NAME_STUB,
  command: HOSTILE_NAME_STUB,
  isTurboTask: false
};

const HOSTILE_SCRIPT_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [HOSTILE_SCRIPT_CARD] };

const HOSTILE_SCRIPT_ROWS: FieldRow[] = [
  ['Command', 'pnpm run lint'],
  ['Script', HOSTILE_NAME_STUB],
  ['Description', 'none'],
  ['Dependents', 'none']
];

const RUNNING_CARD_CASES: [string, TaskCard][] = [
  ['turbo', TURBO_RUNNING_CARD],
  ['script', KEPT_SCRIPT_CARD]
];

const SCRIPT_ROWS: FieldRow[] = [
  ['Command', 'pnpm run lint'],
  ['Script', 'eslint .'],
  ['Description', 'none'],
  ['Dependents', 'none']
];

const REFUSED_ROWS: FieldRow[] = [
  ['Script', 'eslint .'],
  ['Description', 'none'],
  ['Dependents', 'none']
];

test.describe('FEATURE: package details page, turbo tasks and scripts', () => {
  test(
    'GIVEN turbo tasks and a script, each kind gets its own titled section',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows two turbo cards and a script card', async (): Promise<void> =>
        detailsPage.open(MIXED_STATE));

      await test.step('THEN the turbo section comes first, then the scripts section', async (): Promise<void> =>
        expect(detailsPage.sectionTitles).toHaveText(['Turbo tasks (2)', 'Scripts (1)']));

      await test.step('AND the turbo cards come before the script card', async (): Promise<void> =>
        expect(detailsPage.cardTitles).toHaveText(['build', 'test', 'lint']));
    }
  );

  test(
    'GIVEN a script card, it shows its run command and script body',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the script card', async (): Promise<void> => detailsPage.open(MIXED_STATE));

      await test.step('THEN its fields are Command, Script, Description and Dependents', async (): Promise<void> =>
        detailsPage.card('lint').expectFields(SCRIPT_ROWS));

      await test.step('AND its idle status is blank', async (): Promise<void> => detailsPage.card('lint').expectBlankStatus());
    }
  );

  test('GIVEN an idle script card, Run and Copy post its id', { annotation: AC6 }, async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the script card', async (): Promise<void> => detailsPage.open(SCRIPTS_ONLY_STATE));

    await test.step('AND Run is clicked', async (): Promise<void> => detailsPage.pressButton('Run lint'));

    await test.step('THEN the page posts run with its id', async (): Promise<void> =>
      detailsPage.expectLastPosted({ type: 'run', taskId: 'web#lint' }));

    await test.step('WHEN Copy is clicked', async (): Promise<void> => detailsPage.pressButton('Copy command for lint'));

    await test.step('THEN the page posts copy with its id', async (): Promise<void> =>
      detailsPage.expectLastPosted({ type: 'copy', taskId: 'web#lint' }));
  });

  test(
    'GIVEN a running script, the card offers Stop, then Run once the run ends',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('lint');

      await test.step('WHEN the page shows the script card', async (): Promise<void> => detailsPage.open(SCRIPTS_ONLY_STATE));

      await test.step('AND its run starts', async (): Promise<void> => detailsPage.sendRunState('web#lint', RUNNING));

      await test.step('THEN the card offers Stop', async (): Promise<void> =>
        expect(card.runButton).toHaveAttribute('aria-label', 'Stop lint'));

      await test.step('AND keeps Copy', async (): Promise<void> =>
        expect(card.copyButton).toHaveAttribute('aria-label', 'Copy command for lint'));

      await test.step('WHEN Stop is clicked', async (): Promise<void> => detailsPage.pressButton('Stop lint'));

      await test.step('THEN the page posts stop with its id', async (): Promise<void> =>
        detailsPage.expectLastPosted({ type: 'stop', taskId: 'web#lint' }));

      await test.step('WHEN the run ends stopped', async (): Promise<void> => detailsPage.sendRunState('web#lint', STOPPED));

      await test.step('THEN the status shows the end state', async (): Promise<void> =>
        expect(card.status).toHaveText('stopped · 3.0s'));

      await test.step('AND the card offers Run again', async (): Promise<void> =>
        expect(card.runButton).toHaveAttribute('aria-label', 'Run lint'));
    }
  );

  for (const [kind, runningCard] of RUNNING_CARD_CASES) {
    test(
      `GIVEN focus on Stop of a ${kind} card, a click in the frame its run ends does not relaunch it`,
      { annotation: AC6 },
      async ({ detailsPage, pageClock }): Promise<void> => {
        const { name, taskId } = runningCard;
        const card = detailsPage.card(name);
        const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [runningCard] };

        await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

        await test.step('AND shows the running card', async (): Promise<void> => detailsPage.open(state));

        await test.step('AND its Stop button is focused', async (): Promise<void> => detailsPage.focusButton(`Stop ${name}`));

        await test.step('AND the run ends and the focused button is clicked in the same frame', async (): Promise<void> =>
          card.sendRunStateAndClickFocused(taskId, STOPPED));

        await test.step('THEN the Run button has focus', async (): Promise<void> => detailsPage.expectFocused(`Run ${name}`));

        await test.step('AND the click posted nothing', async (): Promise<void> => detailsPage.expectPosted([{ type: 'ready' }]));

        await test.step('WHEN the click hold has passed', async (): Promise<void> => pageClock.tick(STOP_TO_RUN_HOLD_MS));

        await test.step('AND Run is clicked', async (): Promise<void> => detailsPage.pressButton(`Run ${name}`));

        await test.step('THEN the page posts run with its id', async (): Promise<void> =>
          detailsPage.expectLastPosted({ type: 'run', taskId }));
      }
    );
  }

  test(
    'GIVEN no focus on Stop, a click right after its run ends does not relaunch it, one after the hold does',
    { annotation: AC6 },
    async ({ detailsPage, pageClock }): Promise<void> => {
      const { name, taskId } = TURBO_RUNNING_CARD;
      const card = detailsPage.card(name);
      const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [TURBO_RUNNING_CARD] };

      await test.step('WHEN the page has a fake clock', async (): Promise<void> => pageClock.install());

      await test.step('AND shows the running card', async (): Promise<void> => detailsPage.open(state));

      await test.step('AND the run ends stopped', async (): Promise<void> => detailsPage.sendRunState(taskId, STOPPED));

      await test.step('AND Run is clicked right away', async (): Promise<void> => card.runButton.click());

      await test.step('AND again just before the hold ends', async (): Promise<void> => {
        await pageClock.tick(STOP_TO_RUN_HOLD_MS - 1);
        await card.runButton.click();
      });

      await test.step('THEN neither click posted anything', async (): Promise<void> => detailsPage.expectPosted([{ type: 'ready' }]));

      await test.step('WHEN the hold ends', async (): Promise<void> => pageClock.tick(1));

      await test.step('AND Run is clicked', async (): Promise<void> => card.runButton.click());

      await test.step('THEN the page posts run with its id', async (): Promise<void> =>
        detailsPage.expectLastPosted({ type: 'run', taskId }));
    }
  );

  test(
    'GIVEN focus on Stop and a held Enter, the key repeat after the run ends does not relaunch it',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      const { name, taskId } = TURBO_RUNNING_CARD;
      const card = detailsPage.card(name);
      const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [TURBO_RUNNING_CARD] };

      await test.step('WHEN the page shows the running card', async (): Promise<void> => detailsPage.open(state));

      await test.step('AND its Stop button is focused', async (): Promise<void> => detailsPage.focusButton(`Stop ${name}`));

      await test.step('AND Enter goes down on it and stays held', async (): Promise<void> => card.holdEnter());

      await test.step('AND the run ends stopped', async (): Promise<void> => detailsPage.sendRunState(taskId, STOPPED));

      await test.step('AND Enter repeats two frames later', async (): Promise<void> => card.repeatEnterTwoFramesLater());

      await test.step('THEN the Run button has focus', async (): Promise<void> => detailsPage.expectFocused(`Run ${name}`));

      await test.step('AND the page posted stop only', async (): Promise<void> =>
        detailsPage.expectPosted([{ type: 'ready' }, { type: 'stop', taskId }]));
    }
  );

  test(
    'GIVEN a script with a hostile name and body, both render as text',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card(HOSTILE_NAME_STUB);

      await test.step('WHEN the page shows the hostile script card', async (): Promise<void> =>
        detailsPage.open(HOSTILE_SCRIPT_STATE));

      await test.step('THEN the card title text is the name', async (): Promise<void> =>
        expect(card.title).toHaveText(HOSTILE_NAME_STUB));

      await test.step('AND the Script field is the body as text', async (): Promise<void> => card.expectFields(HOSTILE_SCRIPT_ROWS));

      await test.step('AND the Copy button label carries the name as text', async (): Promise<void> =>
        expect(card.copyButton).toHaveAttribute('aria-label', `Copy command for ${HOSTILE_NAME_STUB}`));

      await test.step('AND no image element exists', async (): Promise<void> => expect(detailsPage.images).toHaveCount(0));

      await test.step('AND no CSP violation is recorded', async (): Promise<void> => detailsPage.expectNoViolations());
    }
  );

  test('GIVEN a multi-line script, its card keeps the line break', { annotation: AC6 }, async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows a script whose body spans two lines', async (): Promise<void> =>
      detailsPage.open(MULTI_LINE_STATE));

    await test.step('THEN the Script field renders both lines', async (): Promise<void> =>
      detailsPage.card('lint').expectRenderedField('Script', 'eslint .\n--fix'));
  });

  test(
    'GIVEN a script the run flow refuses, its card has no Command field but keeps Run and Copy',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('a b');

      await test.step('WHEN the page shows the refused script card', async (): Promise<void> => detailsPage.open(REFUSED_STATE));

      await test.step('THEN its fields start at Script', async (): Promise<void> => card.expectFields(REFUSED_ROWS));

      await test.step('AND it offers Run', async (): Promise<void> => expect(card.runButton).toHaveAttribute('aria-label', 'Run a b'));

      await test.step('AND Copy', async (): Promise<void> =>
        expect(card.copyButton).toHaveAttribute('aria-label', 'Copy command for a b'));
    }
  );

  test('GIVEN only script cards, the empty turbo section is left out', { annotation: AC6 }, async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows a script card alone', async (): Promise<void> => detailsPage.open(SCRIPTS_ONLY_STATE));

    await test.step('THEN only the scripts section shows', async (): Promise<void> =>
      expect(detailsPage.sectionTitles).toHaveText(['Scripts (1)']));
  });

  test(
    'GIVEN hidden scripts and turbo cards, no scripts section and no hint show',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the turbo cards with scripts hidden', async (): Promise<void> =>
        detailsPage.open(HIDDEN_TURBO_STATE));

      await test.step('THEN only the turbo section shows', async (): Promise<void> =>
        expect(detailsPage.sectionTitles).toHaveText(['Turbo tasks (2)']));

      await test.step('AND no empty-package text shows', async (): Promise<void> => expect(detailsPage.noCardsNotice).toHaveCount(0));
    }
  );

  test(
    'GIVEN hidden scripts and a running script card kept, no hint shows',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows only the running script card with scripts hidden', async (): Promise<void> =>
        detailsPage.open(HIDDEN_KEPT_STATE));

      await test.step('THEN only the scripts section shows', async (): Promise<void> =>
        expect(detailsPage.sectionTitles).toHaveText(['Scripts (1)']));

      await test.step('AND no empty-package text shows', async (): Promise<void> => expect(detailsPage.noCardsNotice).toHaveCount(0));
    }
  );

  test(
    'GIVEN a kept script card stopped from the keyboard, focus moves to the page title when the card goes',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('lint');

      await test.step('WHEN the page shows only the running script card with scripts hidden', async (): Promise<void> =>
        detailsPage.open(HIDDEN_KEPT_STATE));

      await test.step('AND Enter is pressed on its Stop button', async (): Promise<void> => card.runButton.press('Enter'));

      await test.step('THEN the page posts stop with its id', async (): Promise<void> =>
        detailsPage.expectLastPosted({ type: 'stop', taskId: 'web#lint' }));

      await test.step('WHEN the host drops the stopped card', async (): Promise<void> => detailsPage.sendState(HIDDEN_DROPPED_STATE));

      await test.step('THEN the page title has focus', async (): Promise<void> => expect(detailsPage.heading).toBeFocused());

      await test.step('AND the title takes focus from script only, not from Tab', async (): Promise<void> =>
        expect(detailsPage.heading).toHaveAttribute('tabindex', '-1'));
    }
  );

  test(
    'GIVEN hidden scripts and no card, the page says how many scripts it hides',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the package with 3 scripts hidden', async (): Promise<void> =>
        detailsPage.open(HIDDEN_EMPTY_STATE));

      await test.step('THEN the hint names the count', async (): Promise<void> =>
        expect(detailsPage.noCardsNotice).toHaveText('No turbo tasks in this package. Show scripts to see 3.'));

      await test.step('AND it is plain text, not a link', async (): Promise<void> =>
        expect(detailsPage.noCardsNotice.getByRole('link')).toHaveCount(0));

      await test.step('AND no section shows', async (): Promise<void> => expect(detailsPage.sectionTitles).toHaveCount(0));
    }
  );

  test(
    'GIVEN hidden scripts with none to show and no card, the page says it has no tasks',
    { annotation: AC6 },
    async ({ detailsPage }): Promise<void> => {
      await test.step('WHEN the page shows the package with no hidden script', async (): Promise<void> =>
        detailsPage.open(HIDDEN_NONE_STATE));

      await test.step('THEN the no-tasks text shows', async (): Promise<void> =>
        expect(detailsPage.noCardsNotice).toHaveText('No tasks in this package.'));
    }
  );
});
