import { test } from './graph-task.fixture.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';

const U4B = { description: 'U4b D9 row keys', type: 'requirement' };

const BOARDS = placedBoardsState();

const BOARDS_SAVED = savedWith(BOARDS.hash, {});

const APPS_COLLAPSED = savedWith(BOARDS.hash, { collapsed: ['apps'] });

const APPS_ITEMS = ['Collapse', 'Focus folder', 'Exclude folder'];

test.describe('FEATURE: folder row keys', () => {
  test(
    'GIVEN the grouped boards, each row is one toolbar and one Tab stop, in the scene order',
    { annotation: U4B },
    async ({ graphFolderInspect, graphMenus, graphWidgetKeys, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the container has focus', async (): Promise<void> => {
        await graphFolderInspect.open(BOARDS_SAVED, BOARDS);
        await graphWidgets.focusContainer();
      });

      await test.step('THEN apps has one toolbar named apps', async (): Promise<void> => graphWidgetKeys.expectOneToolbar('apps'));

      await test.step('AND packages has one toolbar named packages', async (): Promise<void> =>
        graphWidgetKeys.expectOneToolbar('packages'));

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphMenus.pressKey('Tab'));

      await test.step('THEN the apps chevron has focus', async (): Promise<void> => graphWidgets.expectChevronFocused('apps', true));

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphMenus.pressKey('Tab'));

      await test.step('THEN the packages chevron has focus', async (): Promise<void> =>
        graphWidgets.expectChevronFocused('packages', true));
    }
  );

  test(
    'GIVEN the apps chevron focused, Right walks the row and wraps, Left wraps back, Home and End jump to the ends',
    { annotation: U4B },
    async ({ graphFolderInspect, graphMenus, graphWidgetInput, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open and Tab moves from the container to the apps row', async (): Promise<void> => {
        await graphFolderInspect.open(BOARDS_SAVED, BOARDS);
        await graphWidgets.focusContainer();
        await graphMenus.pressKey('Tab');
      });

      await test.step('THEN the apps chevron has focus', async (): Promise<void> => graphWidgets.expectChevronFocused('apps', true));

      await test.step('WHEN Right is pressed', async (): Promise<void> => graphMenus.pressKey('ArrowRight'));

      await test.step('THEN the apps title has focus', async (): Promise<void> => graphWidgetInput.expectTitleFocused('apps'));

      await test.step('WHEN Right is pressed', async (): Promise<void> => graphMenus.pressKey('ArrowRight'));

      await test.step('THEN the apps Focus folder has focus', async (): Promise<void> =>
        graphWidgetInput.expectFocusFolderFocused('apps'));

      await test.step('WHEN Right is pressed', async (): Promise<void> => graphMenus.pressKey('ArrowRight'));

      await test.step('THEN the apps "…" has focus', async (): Promise<void> => graphWidgets.expectEllipsisFocused('apps'));

      await test.step('WHEN Right is pressed', async (): Promise<void> => graphMenus.pressKey('ArrowRight'));

      await test.step('THEN focus wraps to the apps chevron', async (): Promise<void> =>
        graphWidgets.expectChevronFocused('apps', true));

      await test.step('WHEN Left is pressed', async (): Promise<void> => graphMenus.pressKey('ArrowLeft'));

      await test.step('THEN focus wraps to the apps "…"', async (): Promise<void> => graphWidgets.expectEllipsisFocused('apps'));

      await test.step('WHEN Home is pressed', async (): Promise<void> => graphMenus.pressKey('Home'));

      await test.step('THEN the apps chevron has focus', async (): Promise<void> => graphWidgets.expectChevronFocused('apps', true));

      await test.step('WHEN End is pressed', async (): Promise<void> => graphMenus.pressKey('End'));

      await test.step('THEN the apps "…" has focus', async (): Promise<void> => graphWidgets.expectEllipsisFocused('apps'));
    }
  );

  test(
    'GIVEN End moved the apps stop to its "…", Shift+Tab leaves the row and Tab comes back to the "…"',
    { annotation: U4B },
    async ({ graphFolderInspect, graphMenus, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open, Tab reaches the apps chevron and End its "…"', async (): Promise<void> => {
        await graphFolderInspect.open(BOARDS_SAVED, BOARDS);
        await graphWidgets.focusContainer();
        await graphMenus.pressKey('Tab');
        await graphMenus.pressKey('End');
      });

      await test.step('THEN the apps "…" has focus', async (): Promise<void> => graphWidgets.expectEllipsisFocused('apps'));

      await test.step('WHEN Shift+Tab is pressed', async (): Promise<void> => graphMenus.pressKey('Shift+Tab'));

      await test.step('THEN the container has focus', async (): Promise<void> => graphMenus.expectFocusOnContainer());

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphMenus.pressKey('Tab'));

      await test.step('THEN the apps "…" has focus', async (): Promise<void> => graphWidgets.expectEllipsisFocused('apps'));
    }
  );

  test(
    'GIVEN the apps chevron panned off the left edge, the apps stop is its title, and back on the chevron once it shows again',
    { annotation: U4B },
    async ({ graphFolderInspect, graphMenus, graphWidgetInput, graphWidgetKeys, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open and apps is panned so its chevron lies past the left edge', async (): Promise<void> => {
        await graphFolderInspect.open(BOARDS_SAVED, BOARDS);
        await graphWidgetKeys.panChevronOffLeft('apps');
      });

      await test.step('THEN the apps "…" shows', async (): Promise<void> => graphWidgets.expectEllipsisShown('apps'));

      await test.step('WHEN Tab is pressed from the container', async (): Promise<void> => {
        await graphWidgets.focusContainer();
        await graphMenus.pressKey('Tab');
      });

      await test.step('THEN the apps title has focus', async (): Promise<void> => graphWidgetInput.expectTitleFocused('apps'));

      await test.step('WHEN apps is panned back and Tab is pressed from the container', async (): Promise<void> => {
        await graphWidgetKeys.panBack();
        await graphWidgets.focusContainer();
        await graphMenus.pressKey('Tab');
      });

      await test.step('THEN the apps chevron has focus', async (): Promise<void> => graphWidgets.expectChevronFocused('apps', true));
    }
  );

  test(
    'GIVEN apps collapsed and its Focus folder reached by keys, Space expands apps, focuses it and keeps focus on the new Focus folder',
    { annotation: U4B },
    async ({ graphFolderInspect, graphGrouping, graphMenus, graphWidgetInput, graphWidgets }): Promise<void> => {
      await test.step('WHEN the boards open with apps collapsed and Tab reaches its row', async (): Promise<void> => {
        await graphFolderInspect.open(APPS_COLLAPSED, BOARDS);
        await graphWidgets.focusContainer();
        await graphMenus.pressKey('Tab');
      });

      await test.step('THEN the collapsed apps chevron has focus', async (): Promise<void> =>
        graphWidgets.expectChevronFocused('apps', false));

      await test.step('WHEN End and Left are pressed', async (): Promise<void> => {
        await graphMenus.pressKey('End');
        await graphMenus.pressKey('ArrowLeft');
      });

      await test.step('THEN the apps Focus folder has focus', async (): Promise<void> =>
        graphWidgetInput.expectFocusFolderFocused('apps'));

      await test.step('WHEN Space is pressed', async (): Promise<void> => graphMenus.pressKey('Space'));

      await test.step('THEN apps is expanded', async (): Promise<void> => graphGrouping.expectFolderCollapsed('apps', false));

      await test.step('AND apps is the focus', async (): Promise<void> => graphWidgetInput.expectFocusFolderPressed('apps', true));

      await test.step("AND the new row's Focus folder has focus", async (): Promise<void> =>
        graphWidgetInput.expectFocusFolderFocused('apps'));
    }
  );

  test(
    'GIVEN apps selected and its row the focus, Shift+F10 opens the apps folder menu',
    { annotation: U4B },
    async ({ graphFolderInspect, graphMenus, graphWidgetInput, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open, the apps title is clicked and Tab moves from the container to its row', async (): Promise<void> => {
        await graphFolderInspect.open(BOARDS_SAVED, BOARDS);
        await graphWidgetInput.clickTitle('apps');
        await graphWidgets.focusContainer();
        await graphMenus.pressKey('Tab');
      });

      await test.step('THEN the apps chevron has focus', async (): Promise<void> => graphWidgets.expectChevronFocused('apps', true));

      await test.step('WHEN Shift+F10 is pressed', async (): Promise<void> => graphMenus.pressShiftF10());

      await test.step('THEN the apps folder menu opens', async (): Promise<void> => graphMenus.expectItems(APPS_ITEMS));
    }
  );
});
