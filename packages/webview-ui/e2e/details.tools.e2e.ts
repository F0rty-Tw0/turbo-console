import { test } from './details.fixture.ts';
import { CONTINUOUS_CHIP, FULL_TERMS, SCRIPT_TERMS } from './test/common/details.const.ts';
import {
  PACKAGE_DETAILS_STUB,
  RUNNING_RUN_VIEW_STUB,
  STOPPED_RUN_VIEW_STUB,
  TASK_CARD_STUB
} from './test/stubs/details-state.stub.ts';
import type { PackageDetails, TaskCard, ToolView } from '../src/bridge/common/details-state.type.ts';

const VITEST_TOOL: ToolView = { title: 'Vitest', iconId: 'turbo-console-vitest' };

const ESLINT_TOOL: ToolView = { title: 'ESLint', iconId: 'turbo-console-eslint' };

const TURBO_CARD: TaskCard = { ...TASK_CARD_STUB, tool: VITEST_TOOL };

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
  runCommand: 'pnpm run lint',
  tool: ESLINT_TOOL
};

const stateOf = (card: TaskCard): PackageDetails => {
  const state: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [card] };

  return state;
};

const TEXT_ONLY_CASES: [string, ToolView][] = [
  ['a tool without a logo', { title: 'Playwright', iconId: null }],
  ['a codicon id that is not a tool icon', { title: 'Playwright', iconId: 'tools' }],
  ['an invalid icon id', { title: 'Playwright', iconId: 'Bad Id!' }]
];

test.describe('FEATURE: package details page, the Tool chip', () => {
  test('GIVEN a turbo card with a known tool, the Tool chip carries the logo and there is no Tool fact', async ({
    detailsPage
  }): Promise<void> => {
    const card = detailsPage.card('build');

    await test.step('WHEN the page shows the card', async (): Promise<void> => detailsPage.open(stateOf(TURBO_CARD)));

    await test.step('THEN the facts hold no Tool row', async (): Promise<void> => card.expectFields(FULL_TERMS));

    await test.step('AND the Tool chip is the codicon span, then the name', async (): Promise<void> =>
      card.expectToolChip('Vitest', 'turbo-console-vitest'));

    await test.step('AND the chips list Tool first, then Continuous', async (): Promise<void> =>
      card.expectChips(['Vitest', CONTINUOUS_CHIP]));

    await test.step('AND no CSP violation or console error is recorded', async (): Promise<void> => {
      await detailsPage.expectNoViolations();
      detailsPage.expectNoErrors();
    });
  });

  test('GIVEN a script card with a known tool, the Tool chip carries the logo and there is no Tool fact', async ({
    detailsPage
  }): Promise<void> => {
    const card = detailsPage.card('lint');

    await test.step('WHEN the page shows the card', async (): Promise<void> => detailsPage.open(stateOf(SCRIPT_CARD)));

    await test.step('THEN the facts hold no Tool row', async (): Promise<void> => card.expectFields(SCRIPT_TERMS));

    await test.step('AND the Tool chip carries the logo', async (): Promise<void> =>
      card.expectToolChip('ESLint', 'turbo-console-eslint'));

    await test.step('AND no console error is logged', (): void => detailsPage.expectNoErrors());
  });

  for (const [given, tool] of TEXT_ONLY_CASES) {
    test(`GIVEN ${given}, the Tool chip is text only`, async ({ detailsPage }): Promise<void> => {
      const card = detailsPage.card('build');

      await test.step('WHEN the page shows the card', async (): Promise<void> =>
        detailsPage.open(stateOf({ ...TASK_CARD_STUB, tool })));

      await test.step('THEN the Tool chip is the name with no codicon', async (): Promise<void> =>
        card.expectToolChip('Playwright', null));

      await test.step('AND no console error is logged', (): void => detailsPage.expectNoErrors());
    });
  }

  test('GIVEN a card with no tool, there is no Tool chip', async ({ detailsPage }): Promise<void> => {
    const card = detailsPage.card('build');

    await test.step('WHEN the page shows the card', async (): Promise<void> => detailsPage.open(stateOf(TASK_CARD_STUB)));

    await test.step('THEN the only chip is Continuous, with no Tool chip', async (): Promise<void> =>
      card.expectChips([CONTINUOUS_CHIP]));

    await test.step('AND the facts are the turbo facts', async (): Promise<void> => card.expectFields(FULL_TERMS));

    await test.step('AND no console error is logged', (): void => detailsPage.expectNoErrors());
  });

  test('GIVEN a card with a tool, the chip stays while the task runs and after it ends', async ({ detailsPage }): Promise<void> => {
    const card = detailsPage.card('build');

    await test.step('WHEN the page shows the card and its run starts', async (): Promise<void> => {
      await detailsPage.open(stateOf(TURBO_CARD));
      await detailsPage.sendRunState('web#build', RUNNING_RUN_VIEW_STUB);
    });

    await test.step('THEN the status icon spins', async (): Promise<void> =>
      card.expectStatusIcon('codicon codicon-sync codicon-modifier-spin', ''));

    await test.step('AND the Tool chip still carries the logo', async (): Promise<void> =>
      card.expectToolChip('Vitest', 'turbo-console-vitest'));

    await test.step('WHEN the run ends stopped', async (): Promise<void> =>
      detailsPage.sendRunState('web#build', STOPPED_RUN_VIEW_STUB));

    await test.step('THEN the status icon is the stop icon', async (): Promise<void> =>
      card.expectStatusIcon('codicon codicon-debug-stop', 'var(--vscode-disabledForeground)'));

    await test.step('AND the Tool chip still carries the logo', async (): Promise<void> =>
      card.expectToolChip('Vitest', 'turbo-console-vitest'));

    await test.step('AND no violation or console error is recorded', async (): Promise<void> => {
      await detailsPage.expectNoViolations();
      detailsPage.expectNoErrors();
    });
  });
});
