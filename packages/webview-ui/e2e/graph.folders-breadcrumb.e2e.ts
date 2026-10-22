import { test } from './graph.fixture.ts';
import { breadcrumbState } from './test/utils/graph-breadcrumb.spec.util.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';

const C9 = { description: 'M4-4 C9', type: 'requirement' };

const BOARDS = placedBoardsState();

const CRUMBS = breadcrumbState();

const CORE_PACKAGES = ['core-1', 'core-2', 'core-3'];

const CORE_LINES = ['3 links with a not shown', '3 links with b not shown', '2 links with c not shown', 'and 2 more folders'];

test.describe('FEATURE: folder focus breadcrumb', () => {
  test(
    'GIVEN the core folder focused, the breadcrumb names the folders it hides links with, and All folders clears the focus',
    { annotation: C9 },
    async ({ graphCamera, graphFolderInspect, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped page opens with no folder focused', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(CRUMBS.hash, {}), CRUMBS));

      await test.step('THEN the breadcrumb is hidden', async (): Promise<void> => graphMenus.expectBreadcrumbHidden());

      await test.step('WHEN Focus folder is chosen from the core menu', async (): Promise<void> => {
        await graphMenus.openFolderMenu('core');
        await graphMenus.item('Focus folder').click();
      });

      await test.step('THEN only the core packages are visible', async (): Promise<void> => graphCamera.expectVisible(CORE_PACKAGES));

      await test.step('AND the breadcrumb shows core as the current page at the canvas top left', async (): Promise<void> =>
        graphMenus.expectBreadcrumbShown('core'));

      await test.step('AND its lines count the links to a, b and c, then the 2 folders left', async (): Promise<void> =>
        graphMenus.expectBreadcrumbLines(CORE_LINES));

      await test.step('WHEN All folders is pressed', async (): Promise<void> => graphMenus.clickAllFolders());

      await test.step('THEN the breadcrumb is hidden, every package is visible and the list header reads Focus again', async (): Promise<void> => {
        await graphMenus.expectBreadcrumbHidden();
        await graphCamera.expectVisible(stateNamesOf(CRUMBS));
        await graphFolderInspect.expectHeaderFocusText('core', 'Focus');
      });
    }
  );

  test(
    'GIVEN the core folder focused, turning Group by folder off hides the breadcrumb',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped page opens and Focus folder is chosen from the core menu', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(CRUMBS.hash, {}), CRUMBS);
        await graphMenus.openFolderMenu('core');
        await graphMenus.item('Focus folder').click();
      });

      await test.step('THEN the breadcrumb is shown', async (): Promise<void> => graphMenus.expectBreadcrumbShown('core'));

      await test.step('WHEN Group by folder is unchecked', async (): Promise<void> => graphGrouping.setGrouped(false));

      await test.step('THEN the breadcrumb is hidden', async (): Promise<void> => graphMenus.expectBreadcrumbHidden());
    }
  );

  test(
    'GIVEN the apps menu open, unchecking Group by folder with a click closes it and leaves focus on the checkbox',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphMenus, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the apps "…" menu is open', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS);
        await graphMenus.openFolderMenu('apps');
      });

      await test.step('AND Group by folder is unchecked', async (): Promise<void> => graphGrouping.setGrouped(false));

      await test.step('THEN no menu and no header row is left, and focus is on the checkbox', async (): Promise<void> => {
        await graphMenus.expectNoMenu();
        await graphWidgets.expectNoRows();
        await graphMenus.expectFocusOnGrouping();
      });
    }
  );

  test(
    'GIVEN the apps menu open, unchecking Group by folder from the page drops the menu and focus goes to the container',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphMenus, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the apps "…" menu is open', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS);
        await graphMenus.openFolderMenu('apps');
      });

      await test.step('AND Group by folder is unchecked without moving focus out of the menu', async (): Promise<void> => {
        await graphMenus.ungroupWhileOpen();
      });

      await test.step('THEN no menu is left, no header row is left and focus is on the container', async (): Promise<void> => {
        await graphGrouping.expectGrouped(false);
        await graphMenus.expectNoMenu();
        await graphWidgets.expectNoRows();
        await graphMenus.expectFocusOnContainer();
      });
    }
  );
});
