import { expect, test } from './details.fixture.ts';
import {
  FAILED_RUN_VIEW_STUB,
  PACKAGE_DETAILS_STUB,
  PASSED_RUN_VIEW_STUB,
  RUNNING_RUN_VIEW_STUB,
  RUN_VIEW_STUB,
  STOPPED_RUN_VIEW_STUB
} from './test/stubs/details-state.stub.ts';
import type { RunView } from '../src/bridge/common/details-state.type.ts';

const FRAME_COLOR = 'rgb(68, 68, 68)';

const RUNNING_COLOR = 'rgb(0, 120, 212)';

const FAILED_COLOR = 'rgb(241, 76, 76)';

const PASSED_COLOR = 'rgb(0, 128, 0)';

const STOPPED_COLOR = 'rgb(113, 113, 113)';

/**
 * A frame colour and one colour per variable a run's status icon reads, all different: the status icon takes its
 * status colour, the card frame never does. `--vscode-contrastBorder` stays unset, as in every theme but high contrast.
 */
const STATUS_THEME = {
  '--vscode-widget-border': FRAME_COLOR,
  '--vscode-progressBar-background': RUNNING_COLOR,
  '--vscode-testing-iconFailed': FAILED_COLOR,
  '--vscode-testing-iconPassed': PASSED_COLOR,
  '--vscode-descriptionForeground': STOPPED_COLOR
};

const CONTINUOUS_RUN: RunView = { ...RUNNING_RUN_VIEW_STUB, iconId: 'pulse', text: 'continuous', isSpinning: false };

const CACHED_RUN: RunView = { ...PASSED_RUN_VIEW_STUB, text: '3.2s · cached' };

/** [run state, the run the host sends, the status line it shows, its status icon colour under `STATUS_THEME`]. */
const RUN_STATES: [string, RunView, string | RegExp, string][] = [
  ['running', RUNNING_RUN_VIEW_STUB, /^running · \d+s$/u, RUNNING_COLOR],
  ['continuous-running', CONTINUOUS_RUN, /^continuous · \d+s$/u, RUNNING_COLOR],
  ['failed', FAILED_RUN_VIEW_STUB, 'failed', FAILED_COLOR],
  ['passed', PASSED_RUN_VIEW_STUB, 'passed', PASSED_COLOR],
  ['cached', CACHED_RUN, '3.2s · cached', PASSED_COLOR],
  ['stopped', STOPPED_RUN_VIEW_STUB, 'stopped · 3.0s', STOPPED_COLOR]
];

test.describe('FEATURE: package details page, a themed card frame in every run state', () => {
  for (const [state, run, statusText, iconColor] of RUN_STATES) {
    test(`GIVEN a themed card whose run is ${state}, its status icon takes the status colour and the card frame stays the frame colour`, async ({
      detailsPage,
      pageLayout
    }): Promise<void> => {
      const card = pageLayout.card('build');

      await test.step('WHEN the page shows the idle card', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

      await test.step('AND the theme sets a frame colour and one colour per status', async (): Promise<void> =>
        pageLayout.setThemeVars(STATUS_THEME));

      await test.step(`AND the run is ${state}`, async (): Promise<void> => detailsPage.sendRunState('web#build', run));

      await test.step('THEN the status line shows the run', async (): Promise<void> =>
        expect(detailsPage.card('build').status).toHaveText(statusText));

      await test.step('AND the status icon is drawn in the status colour', async (): Promise<void> =>
        card.expectStatusIconColor(iconColor));

      await test.step('AND the card frame has the frame colour', async (): Promise<void> => card.expectFrameColor(FRAME_COLOR));

      await test.step('AND the card frame is the same on every side', async (): Promise<void> => card.expectNeutralFrame());
    });
  }

  test('GIVEN a themed card whose run fails and then clears, the idle card frame stays the frame colour', async ({
    detailsPage,
    pageLayout
  }): Promise<void> => {
    const card = pageLayout.card('build');

    await test.step('WHEN the page shows the idle card', async (): Promise<void> => detailsPage.open(PACKAGE_DETAILS_STUB));

    await test.step('AND the theme sets a frame colour and one colour per status', async (): Promise<void> =>
      pageLayout.setThemeVars(STATUS_THEME));

    await test.step('AND the run fails', async (): Promise<void> => detailsPage.sendRunState('web#build', FAILED_RUN_VIEW_STUB));

    await test.step('AND the status icon is drawn in the failed colour', async (): Promise<void> =>
      card.expectStatusIconColor(FAILED_COLOR));

    await test.step('AND the run goes back to idle', async (): Promise<void> => detailsPage.sendRunState('web#build', RUN_VIEW_STUB));

    await test.step('THEN the card shows no status', async (): Promise<void> => detailsPage.card('build').expectBlankStatus());

    await test.step('AND the card frame has the frame colour', async (): Promise<void> => card.expectFrameColor(FRAME_COLOR));

    await test.step('AND the card frame is the same on every side', async (): Promise<void> => card.expectNeutralFrame());
  });
});
