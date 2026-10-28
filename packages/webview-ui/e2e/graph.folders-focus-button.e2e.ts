import { expect, test } from './graph-task.fixture.ts';
import { deepFolderState, placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { Position } from '../src/bridge/common/graph-state.type.ts';

const U4B = { description: 'U4b D7 Focus folder', type: 'requirement' };

const BOARDS = placedBoardsState();

const BOARDS_SAVED = savedWith(BOARDS.hash, {});

const APPS_COLLAPSED = savedWith(BOARDS.hash, { collapsed: ['apps'] });

const DEEP = deepFolderState();

const PRESSED_FILL = 'rgb(1, 2, 3)';

const EDITOR_BASE = 'rgb(10, 20, 30)';

const PRESSED_THEME_VARS = { '--vscode-inputOption-activeBackground': PRESSED_FILL, '--vscode-editor-background': EDITOR_BASE };

/** Keeps the `deep` box's top band and both ends on the canvas at both zooms below. */
const DEEP_PAN: Position = { x: 400, y: 150 };

/** The `deep` row is 145 px wide here, under the 168 px Focus folder needs. */
const DEEP_NARROW_ZOOM = 1.4185;

/** The `deep` row is 171.3 px wide here. */
const DEEP_WIDE_ZOOM = 1.65;

test.describe('FEATURE: the folder row Focus folder button', () => {
  test(
    'GIVEN the grouped boards, a click on the apps Focus folder presses it and a second click unpresses it',
    { annotation: U4B },
    async ({ graphFolderInspect, graphWidgetInput }): Promise<void> => {
      await test.step('WHEN the grouped boards open', async (): Promise<void> => graphFolderInspect.open(BOARDS_SAVED, BOARDS));

      await test.step('AND the apps Focus folder is clicked', async (): Promise<void> => graphWidgetInput.clickFocusFolder('apps'));

      await test.step('THEN it is pressed, titled Clear focus, and the Controls header agrees', async (): Promise<void> => {
        await graphWidgetInput.expectFocusFolderPressed('apps', true);
        await graphFolderInspect.expectHeaderFocusText('apps', 'Clear focus');
      });

      await test.step('WHEN it is clicked again', async (): Promise<void> => graphWidgetInput.clickFocusFolder('apps'));

      await test.step('THEN it is unpressed, titled Focus folder, and the Controls header agrees', async (): Promise<void> => {
        await graphWidgetInput.expectFocusFolderPressed('apps', false);
        await graphFolderInspect.expectHeaderFocusText('apps', 'Focus');
      });
    }
  );

  test(
    'GIVEN theme vars, a click on the apps Focus folder fills it in the active option colour over the opaque editor base',
    { annotation: U4B },
    async ({ graphFolderInspect, graphWidgetInput, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open', async (): Promise<void> => graphFolderInspect.open(BOARDS_SAVED, BOARDS));

      await test.step(`AND the theme sets inputOption-activeBackground ${PRESSED_FILL} and editor-background ${EDITOR_BASE}`, async (): Promise<void> =>
        graphWidgets.setThemeVars(PRESSED_THEME_VARS));

      await test.step('AND the apps Focus folder is clicked', async (): Promise<void> => graphWidgetInput.clickFocusFolder('apps'));

      await test.step(`THEN it fills ${PRESSED_FILL} over ${EDITOR_BASE}`, async (): Promise<void> =>
        graphWidgetInput.expectFocusFolderFill('apps', PRESSED_FILL, EDITOR_BASE));
    }
  );

  test(
    'GIVEN apps collapsed, a click on its Focus folder expands it and the new row shows the button pressed',
    { annotation: U4B },
    async ({ graphFolderInspect, graphGrouping, graphWidgetInput }): Promise<void> => {
      await test.step('WHEN the boards open with apps collapsed', async (): Promise<void> =>
        graphFolderInspect.open(APPS_COLLAPSED, BOARDS));

      await test.step('AND the apps Focus folder is clicked', async (): Promise<void> => graphWidgetInput.clickFocusFolder('apps'));

      await test.step('THEN apps is expanded', async (): Promise<void> => graphGrouping.expectFolderCollapsed('apps', false));

      await test.step('AND its Focus folder is pressed', async (): Promise<void> =>
        graphWidgetInput.expectFocusFolderPressed('apps', true));
    }
  );

  test(
    'GIVEN the apps Focus folder has focus, Space presses it and focus stays on it',
    { annotation: U4B },
    async ({ graphFolderInspect, graphWidgetInput }): Promise<void> => {
      await test.step('WHEN the grouped boards open', async (): Promise<void> => graphFolderInspect.open(BOARDS_SAVED, BOARDS));

      await test.step('AND Space is pressed on the apps Focus folder', async (): Promise<void> =>
        graphWidgetInput.pressSpaceOnFocusFolder('apps'));

      await test.step('THEN it is pressed', async (): Promise<void> => graphWidgetInput.expectFocusFolderPressed('apps', true));

      await test.step('AND it keeps focus', async (): Promise<void> => graphWidgetInput.expectFocusFolderFocused('apps'));
    }
  );

  test(
    'GIVEN a 145 px deep row, its Focus folder is hidden',
    { annotation: U4B },
    async ({ graphFolderInspect, graphWidgetInput, graphWidgets }): Promise<void> => {
      await test.step('WHEN the deep folder opens at zoom 1.4185', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(DEEP.hash, { zoom: DEEP_NARROW_ZOOM, pan: DEEP_PAN }), DEEP));

      await test.step('THEN its row sits on the box', async (): Promise<void> => graphWidgets.expectRowFollowsBox('deep'));

      await test.step('AND its Focus folder is hidden', async (): Promise<void> => graphWidgetInput.expectFocusFolderHidden('deep'));
    }
  );

  test(
    'GIVEN a 171.3 px deep row, its Focus folder shows',
    { annotation: U4B },
    async ({ graphFolderInspect, graphWidgetInput, graphWidgets }): Promise<void> => {
      await test.step('WHEN the deep folder opens at zoom 1.65', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(DEEP.hash, { zoom: DEEP_WIDE_ZOOM, pan: DEEP_PAN }), DEEP));

      await test.step('THEN its row sits on the box', async (): Promise<void> => graphWidgets.expectRowFollowsBox('deep'));

      await test.step('AND its Focus folder shows', async (): Promise<void> =>
        expect(graphWidgetInput.focusFolderOf('deep')).toBeVisible());
    }
  );

  test(
    'GIVEN packages excluded, a click on the apps Focus folder presses it though the visible set stays',
    { annotation: U4B },
    async ({ graphFolderInspect, graphMenus, graphWidgetInput }): Promise<void> => {
      await test.step('WHEN the grouped boards open', async (): Promise<void> => graphFolderInspect.open(BOARDS_SAVED, BOARDS));

      await test.step('AND the packages folder is excluded from its menu', async (): Promise<void> => {
        await graphMenus.openFolderMenu('packages');
        await graphMenus.item('Exclude folder').click();
      });

      await test.step('AND the apps Focus folder is clicked', async (): Promise<void> => graphWidgetInput.clickFocusFolder('apps'));

      await test.step('THEN it is pressed', async (): Promise<void> => graphWidgetInput.expectFocusFolderPressed('apps', true));
    }
  );
});
