import { expect, test } from './graph-task.fixture.ts';
import { fewerLinksState, folderLocationState } from './test/utils/graph-folder-location.spec.util.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';

const C9 = { description: 'M4-4 C9', type: 'requirement' };

const BOARDS = placedBoardsState();

const CRUMBS = folderLocationState();

const CORE_PACKAGES = ['core-1', 'core-2', 'core-3'];

const CORE_LINES = ['3 links with a not shown', '3 links with b not shown', '2 links with c not shown', 'and 2 more folders'];

const FEWER_A_LINKS = fewerLinksState();

const FEWER_A_LINES = ['3 links with b not shown', '2 links with a not shown', '2 links with c not shown', 'and 2 more folders'];

test.describe('FEATURE: folder focus in the location bar', () => {
  test(
    'GIVEN the core folder focused, the location bar names the folders it hides links with, and Packages clears the focus',
    { annotation: C9 },
    async ({ graphCamera, graphFolderInspect, graphLocation, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped page opens with no folder focused', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(CRUMBS.hash, {}), CRUMBS));

      await test.step('THEN the location bar shows only Packages, with no lines', async (): Promise<void> => {
        await graphLocation.expectCrumbs(['Packages'], 'Packages');
        await graphLocation.expectLines([]);
      });

      await test.step('WHEN Focus folder is chosen from the core menu', async (): Promise<void> => {
        await graphMenus.openFolderMenu('core');
        await graphMenus.item('Focus folder').click();
      });

      await test.step('THEN only the core packages are visible', async (): Promise<void> => graphCamera.expectVisible(CORE_PACKAGES));

      await test.step('AND the location bar shows Packages › core, core as the current page', async (): Promise<void> =>
        graphLocation.expectCrumbs(['Packages', 'core'], 'core'));

      await test.step('AND its lines count the links to a, b and c, then the 2 folders left', async (): Promise<void> =>
        graphLocation.expectLines(CORE_LINES));

      await test.step('WHEN the Packages crumb is pressed', async (): Promise<void> => graphLocation.press('Packages'));

      await test.step('THEN the bar shows only Packages, every package is visible and the list header reads Focus again', async (): Promise<void> => {
        await graphLocation.expectCrumbs(['Packages'], 'Packages');
        await graphLocation.expectLines([]);
        await graphCamera.expectVisible(stateNamesOf(CRUMBS));
        await graphFolderInspect.expectHeaderFocusText('core', 'Focus');
      });
    }
  );

  test(
    'GIVEN the core folder focused, turning Group by folder off drops the folder crumb and leaves Packages',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphLocation, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped page opens and Focus folder is chosen from the core menu', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(CRUMBS.hash, {}), CRUMBS);
        await graphMenus.openFolderMenu('core');
        await graphMenus.item('Focus folder').click();
      });

      await test.step('THEN the bar shows Packages › core', async (): Promise<void> =>
        graphLocation.expectCrumbs(['Packages', 'core'], 'core'));

      await test.step('WHEN Group by folder is unchecked', async (): Promise<void> => graphGrouping.setGrouped(false));

      await test.step('THEN the bar shows only Packages, with no lines', async (): Promise<void> => {
        await graphLocation.expectCrumbs(['Packages'], 'Packages');
        await graphLocation.expectLines([]);
      });
    }
  );

  test(
    'GIVEN the core folder focused and focus on the Packages crumb, a state with other links replaces the lines and keeps the crumb focused',
    { annotation: C9 },
    async ({ graphFolderInspect, graphHost, graphLocation, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped page opens, Focus folder is chosen from the core menu and the Packages crumb is focused', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(CRUMBS.hash, {}), CRUMBS);
        await graphMenus.openFolderMenu('core');
        await graphMenus.item('Focus folder').click();
        await graphLocation.expectLines(CORE_LINES);
        await graphLocation.crumb('Packages').focus();
      });

      await test.step('AND a state without the a-pkg -> core-3 link arrives', async (): Promise<void> =>
        graphHost.sendState(FEWER_A_LINKS));

      await test.step('THEN the lines count 2 links with a', async (): Promise<void> => graphLocation.expectLines(FEWER_A_LINES));

      await test.step('AND the Packages crumb still has focus', async (): Promise<void> =>
        expect(graphLocation.crumb('Packages')).toBeFocused());
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
