import type { TaskDefinition } from '@turbo-console/core';

import type { FactPlacement } from './common/playwright.type.ts';
import { test } from './details.fixture.ts';
import {
  PACKAGE_DETAILS_STUB,
  PASSED_RUN_VIEW_STUB,
  RUNNING_RUN_VIEW_STUB,
  TASK_CARD_STUB,
  TASK_DEFINITION_STUB
} from './test/stubs/details-state.stub.ts';
import { packageWithTasks, taskNames } from './test/utils/details-state.spec.util.ts';
import type { PackageDetails, TaskCard } from '../src/bridge/common/details-state.type.ts';

const MONO_FONT = 'TC Mono Test';

const SANS_FONT = 'TC Sans Test';

const FONT_VARS = {
  '--vscode-editor-font-family': `"${MONO_FONT}", monospace`,
  '--vscode-font-family': `"${SANS_FONT}", sans-serif`
};

const RED = 'rgb(255, 0, 0)';

const GREEN = 'rgb(0, 255, 0)';

const PASSED_COLOR = 'rgb(0, 128, 0)';

/** Copy and Show in task graph sit beside Run on every card; Refresh and Open package.json sit in the page header. */
const ICON_BUTTON_LABELS = ['Copy command for build', 'Show in task graph: build', 'Refresh', 'Open package.json'];

const LONG_TITLE = 'a-thirty-character-task-name-x';

const SCRIPT_CARD: TaskCard = {
  ...TASK_CARD_STUB,
  taskId: 'web#lint',
  name: 'lint',
  command: 'eslint .',
  definition: null,
  cacheStatus: null,
  isTurboTask: false,
  runCommand: 'pnpm run lint'
};

const LONG_TITLE_RUNNING_CARD: TaskCard = {
  ...TASK_CARD_STUB,
  taskId: `web#${LONG_TITLE}`,
  name: LONG_TITLE,
  run: RUNNING_RUN_VIEW_STUB
};

const LONG_OUTPUT: TaskDefinition = { ...TASK_DEFINITION_STUB, outputs: ['x'.repeat(400)] };

const LONG_OUTPUT_CARD: TaskCard = { ...TASK_CARD_STUB, definition: LONG_OUTPUT };

const CODE_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [TASK_CARD_STUB, SCRIPT_CARD] };

const LONG_TITLE_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [LONG_TITLE_RUNNING_CARD] };

const LONG_OUTPUT_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [LONG_OUTPUT_CARD] };

const NOT_CACHEABLE: TaskDefinition = { ...TASK_DEFINITION_STUB, cache: false };

const NOT_CACHEABLE_CARD: TaskCard = { ...TASK_CARD_STUB, definition: NOT_CACHEABLE };

const CHIP_STATE: PackageDetails = { ...PACKAGE_DETAILS_STUB, tasks: [NOT_CACHEABLE_CARD] };

const TWO_CARDS_STATE = packageWithTasks(taskNames(2));

/** [viewport width, where a fact's value sits]: the facts go to one column below a 22em card. */
const FACT_PLACEMENTS: [number, FactPlacement][] = [
  [1100, 'beside'],
  [320, 'below']
];

test.describe('FEATURE: package details page, layout and theme', () => {
  test('GIVEN theme fonts, code shows in the editor font and prose in the UI font', async ({
    detailsPage,
    pageLayout
  }): Promise<void> => {
    await test.step('WHEN the page shows a turbo card and a script card', async (): Promise<void> => detailsPage.open(CODE_STATE));

    await test.step('AND the theme sets both fonts', async (): Promise<void> => pageLayout.setThemeVars(FONT_VARS));

    await test.step('THEN the command block uses the editor font', async (): Promise<void> =>
      pageLayout.card('build').expectCodeFont('command', MONO_FONT));

    await test.step('AND the Script fact uses the editor font', async (): Promise<void> =>
      pageLayout.card('lint').expectCodeFont('script', MONO_FONT));

    await test.step('AND a list token uses the editor font', async (): Promise<void> =>
      pageLayout.card('build').expectCodeFont('token', MONO_FONT));

    await test.step('AND the body uses the UI font only', async (): Promise<void> => pageLayout.expectBodyFont(SANS_FONT, MONO_FONT));
  });

  for (const label of ICON_BUTTON_LABELS) {
    test(`GIVEN the ${label} icon button, its hit area is at least 24 × 24`, async ({ detailsPage, pageLayout }): Promise<void> => {
      await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

      await test.step('THEN the button box is at least 24 px each way', async (): Promise<void> =>
        pageLayout.expectHitArea(label, 24));
    });

    test(`GIVEN the ${label} icon button while the codicon font loads, its hit area is at least 24 × 24`, async ({
      detailsPage,
      pageLayout
    }): Promise<void> => {
      await test.step('WHEN the codicon font never arrives', (): void => detailsPage.holdCodiconFont());

      await test.step('AND the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

      await test.step('THEN the codicon font is still loading', async (): Promise<void> => pageLayout.expectCodiconFontLoading());

      await test.step('AND the button box is at least 24 px each way', async (): Promise<void> => pageLayout.expectHitArea(label, 24));
    });
  }

  test('GIVEN two cards at 1100 px, they sit side by side', async ({ detailsPage, pageLayout }): Promise<void> => {
    await test.step('WHEN the page is 1100 px wide', async (): Promise<void> => detailsPage.narrow(1100));

    await test.step('AND the page shows two cards', async (): Promise<void> => detailsPage.open(TWO_CARDS_STATE));

    await test.step('THEN the cards share a row', async (): Promise<void> => pageLayout.expectCardsSideBySide());
  });

  test('GIVEN two cards at 320 px, they stack', async ({ detailsPage, pageLayout }): Promise<void> => {
    await test.step('WHEN the page is 320 px wide', async (): Promise<void> => detailsPage.narrow(320));

    await test.step('AND the page shows two cards', async (): Promise<void> => detailsPage.open(TWO_CARDS_STATE));

    await test.step('THEN each card has a row of its own', async (): Promise<void> => pageLayout.expectCardsStacked());
  });

  for (const [width, placement] of FACT_PLACEMENTS) {
    test(`GIVEN a card at ${width} px, a fact's value sits ${placement} its term`, async ({
      detailsPage,
      pageLayout
    }): Promise<void> => {
      await test.step(`WHEN the page is ${width} px wide`, async (): Promise<void> => detailsPage.narrow(width));

      await test.step('AND the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

      await test.step(`THEN the Cache value sits ${placement} its term`, async (): Promise<void> =>
        pageLayout.card('build').expectFactPlacement('Cache', placement));
    });
  }

  test('GIVEN an idle card, its Stop button is as wide as its Run button', async ({ detailsPage, pageLayout }): Promise<void> => {
    const card = pageLayout.card('build');

    await test.step('WHEN the page shows an idle card', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the Run button width is measured', async (): Promise<void> => card.rememberRunWidth());

    await test.step('AND the task starts running', async (): Promise<void> =>
      detailsPage.sendRunState('web#build', RUNNING_RUN_VIEW_STUB));

    await test.step('AND Stop replaces Run', async (): Promise<void> =>
      detailsPage.card('build').expectButtonText('Stop build', 'Stop'));

    await test.step('THEN the Stop button is as wide', async (): Promise<void> => card.expectRunWidthKept());
  });

  test('GIVEN a running card with a 30-character title at 320 px, its status shows clear of the Run button', async ({
    detailsPage,
    pageLayout
  }): Promise<void> => {
    await test.step('WHEN the page is 320 px wide', async (): Promise<void> => detailsPage.narrow(320));

    await test.step('AND the page shows the running card', async (): Promise<void> => detailsPage.open(LONG_TITLE_STATE));

    await test.step('THEN the status icon and text show inside the card, beside the button', async (): Promise<void> =>
      pageLayout.card(LONG_TITLE).expectStatusClearOfRunButton());
  });

  test('GIVEN a 400-character output at 320 px, the page never scrolls sideways', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page is 320 px wide', async (): Promise<void> => detailsPage.narrow(320));

    await test.step('AND the page shows the state', async (): Promise<void> => detailsPage.open(LONG_OUTPUT_STATE));

    await test.step('THEN the page is no wider than the viewport', async (): Promise<void> =>
      detailsPage.expectNoHorizontalScroll(320));
  });

  test('GIVEN a high contrast active border, hovering Run shows its dashed outline', async ({
    detailsPage,
    pageLayout
  }): Promise<void> => {
    const card = pageLayout.card('build');

    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the theme sets an active border colour', async (): Promise<void> =>
      pageLayout.setThemeVars({ '--vscode-contrastActiveBorder': RED }));

    await test.step('AND the pointer rests on Run', async (): Promise<void> => card.hoverRunButton());

    await test.step('THEN Run has a dashed outline in that colour', async (): Promise<void> => card.expectRunOutline('dashed', RED));
  });

  test('GIVEN a high contrast border, the card frame and the command block use it', async ({
    detailsPage,
    pageLayout
  }): Promise<void> => {
    const card = pageLayout.card('build');

    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the theme sets a contrast border', async (): Promise<void> =>
      pageLayout.setThemeVars({ '--vscode-contrastBorder': GREEN }));

    await test.step('THEN the card frame has that colour', async (): Promise<void> => card.expectFrameColor(GREEN));

    await test.step('AND the command block is outlined in it', async (): Promise<void> => card.expectCommandOutline('solid', GREEN));
  });

  test('GIVEN a high contrast border, a list token is outlined in it', async ({ detailsPage, pageLayout }): Promise<void> => {
    const card = pageLayout.card('build');

    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the theme sets a contrast border', async (): Promise<void> =>
      pageLayout.setThemeVars({ '--vscode-contrastBorder': GREEN }));

    await test.step('THEN the token outline is solid in that colour', async (): Promise<void> =>
      card.expectTokenOutline('solid', GREEN));
  });

  test('GIVEN no theme border variable, every frame still draws a 1px edge', async ({ detailsPage, pageLayout }): Promise<void> => {
    await test.step('WHEN the page shows a card with a chip', async (): Promise<void> => detailsPage.open(CHIP_STATE));

    await test.step('THEN the page header has a 1px bottom edge', async (): Promise<void> =>
      pageLayout.expectBorderWidth('.page-header', 'bottom', '1px'));

    await test.step('AND the section title has a 1px bottom edge', async (): Promise<void> =>
      pageLayout.expectBorderWidth('.section-title', 'bottom', '1px'));

    await test.step('AND the chip has a 1px frame', async (): Promise<void> => pageLayout.expectBorderWidth('.chip', 'top', '1px'));
  });

  test('GIVEN a passed run, the card start edge takes the status colour', async ({ detailsPage, pageLayout }): Promise<void> => {
    const card = pageLayout.card('build');

    await test.step('WHEN the page shows the state', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the theme sets the passed colour', async (): Promise<void> =>
      pageLayout.setThemeVars({ '--vscode-testing-iconPassed': PASSED_COLOR }));

    await test.step('AND the run passes', async (): Promise<void> => detailsPage.sendRunState('web#build', PASSED_RUN_VIEW_STUB));

    await test.step('THEN the start edge is 3 px in the passed colour', async (): Promise<void> =>
      card.expectStartBorder('3px', PASSED_COLOR));
  });
});
