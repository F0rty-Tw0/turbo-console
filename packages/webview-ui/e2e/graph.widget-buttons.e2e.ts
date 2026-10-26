import type { WidgetButtonLook } from './common/graph-widget-button.type.ts';
import { test } from './graph.fixture.ts';
import { THEME_DARK_STUB, THEME_HC_STUB, THEME_LIGHT_STUB } from './test/stubs/graph-theme.stub.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import { expectRoundBordered } from './test/utils/graph-widget-button.spec.util.ts';

const BOARDS = placedBoardsState();

/** The border colour of each stub: the widget border in Dark and Light, the contrast border where High Contrast sets no widget border. */
const THEMES = [
  { name: 'dark', stub: THEME_DARK_STUB, border: 'rgb(49, 49, 49)' },
  { name: 'light', stub: THEME_LIGHT_STUB, border: 'rgb(229, 229, 229)' },
  { name: 'high contrast', stub: THEME_HC_STUB, border: 'rgb(111, 195, 223)' }
];

test.describe('FEATURE: round bordered widget buttons', () => {
  for (const { name, stub, border } of THEMES) {
    const look: WidgetButtonLook = { border, background: stub.expected.fill };

    test(`GIVEN the ${name} theme, the folder chevron and the package "…" are 24 px circles with a 1 px border over the editor background`, async ({
      graphFolderInspect,
      graphList,
      graphLook,
      graphWidgets
    }): Promise<void> => {
      await test.step('WHEN the grouped boards open, the theme is applied and web is picked', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS);
        await graphLook.applyTheme(stub);
        await graphList.pick('web');
      });

      await test.step('THEN the apps chevron is a bordered circle', async (): Promise<void> =>
        expectRoundBordered(graphWidgets.chevronOf('apps', true), look));

      await test.step('AND the package "…" on web is a bordered circle', async (): Promise<void> =>
        expectRoundBordered(graphWidgets.packageButton('web'), look));
    });
  }
});
