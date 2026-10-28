import { IS_SHIFT_F10_SILENT, SHIFT_F10_SILENT_REASON } from './common/graph.const.ts';
import type { GraphOptions } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { THEME_DARK_STUB } from './test/stubs/graph-theme.stub.ts';
import { ghostFolderState, placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphTraceRef, GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const C9 = { description: 'M4-4 C9', type: 'requirement' };

const BOARDS = placedBoardsState();

const HELD: GraphOptions = { workers: 'held' };

const GHOSTS = ghostFolderState();

const FOLDER_ITEMS = ['Collapse', 'Focus folder', 'Exclude folder'];

const TRACE_THROUGH_MID: GraphTraceRef = { start: 'a', end: 'b' };

const KEY_STEPS: [string, string][] = [
  ['ArrowDown', 'Focus folder'],
  ['ArrowDown', 'Exclude folder'],
  ['ArrowDown', 'Collapse'],
  ['ArrowUp', 'Exclude folder'],
  ['Home', 'Collapse'],
  ['End', 'Exclude folder']
];

const APPS_PACKAGES = ['docs', 'web'];

const ALL_PACKAGES = ['docs', 'web', '@acme/config', '@acme/ui', '@acme/utils'];

const grouped = (overrides: Partial<GraphViewState> = {}): GraphViewState => savedWith(BOARDS.hash, overrides);

test.describe('FEATURE: folder widget menus', () => {
  test(
    'GIVEN a switch to flat still laying out, the apps "…" opens no menu',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphMenus, graphWidgets }): Promise<void> => {
      await test.step('WHEN the boards open grouped with the flat layout held and Group by folder is unchecked', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS, HELD);
        await graphGrouping.setGrouped(false);
      });

      await test.step('AND the apps "…", still drawn, is pressed', async (): Promise<void> => graphWidgets.ellipsisOf('apps').click());

      await test.step('THEN no menu opens', async (): Promise<void> => graphMenus.expectNoMenu());
    }
  );

  test(
    'GIVEN packages focused from its menu, Clear focus from its menu gives focus back to its "…" as apps comes back first',
    { annotation: C9 },
    async ({ graphFolderInspect, graphMenus, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened', async (): Promise<void> => graphFolderInspect.open(grouped(), BOARDS));

      await test.step('AND Focus folder is chosen from the packages menu', async (): Promise<void> => {
        await graphMenus.openFolderMenu('packages');
        await graphMenus.item('Focus folder').click();
      });

      await test.step('THEN focus is back on the packages "…"', async (): Promise<void> =>
        graphMenus.expectFocusOnEllipsis('packages'));

      await test.step('AND apps has no row', async (): Promise<void> => graphWidgets.expectNoRow('apps'));

      await test.step('WHEN Clear focus is chosen from the packages menu', async (): Promise<void> => {
        await graphMenus.openFolderMenu('packages');
        await graphMenus.item('Clear focus').click();
      });

      await test.step('THEN apps has its row again', async (): Promise<void> => graphWidgets.expectBoxRow('apps', '2 packages'));

      await test.step('AND focus is still on the packages "…"', async (): Promise<void> =>
        graphMenus.expectFocusOnEllipsis('packages'));
    }
  );

  test(
    'GIVEN the apps "…" menu, the arrow keys move between its items, and Escape closes it onto the "…" with its ring, and a click on empty canvas closes it without giving the "…" focus',
    { annotation: C9 },
    async ({ graphCanvas, graphFolderInspect, graphLook, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened', async (): Promise<void> => graphFolderInspect.open(grouped(), BOARDS));

      await test.step('AND the dark theme is applied', async (): Promise<void> => graphLook.applyTheme(THEME_DARK_STUB));

      await test.step('AND the apps "…" is pressed', async (): Promise<void> => graphMenus.openFolderMenu('apps'));

      await test.step('THEN the menu is named for apps', async (): Promise<void> => graphMenus.expectFolderMenuNamed('apps'));

      await test.step('AND it lists Collapse, Focus folder and Exclude folder', async (): Promise<void> =>
        graphMenus.expectItems(FOLDER_ITEMS));

      await test.step('AND Collapse is focused', async (): Promise<void> => graphMenus.expectFocusedItem('Collapse'));

      for (const [key, item] of KEY_STEPS) {
        await test.step(`WHEN ${key} is pressed`, async (): Promise<void> => graphMenus.pressKey(key));

        await test.step(`THEN ${item} is focused`, async (): Promise<void> => graphMenus.expectFocusedItem(item));
      }

      await test.step('WHEN Escape is pressed', async (): Promise<void> => graphMenus.pressKey('Escape'));

      await test.step('THEN the menu is gone and focus is on the apps "…"', async (): Promise<void> =>
        graphMenus.expectFocusOnEllipsis('apps'));

      await test.step('AND the apps "…" draws its ring', async (): Promise<void> => graphMenus.expectEllipsisRing('apps'));

      await test.step('WHEN the apps "…" is pressed again', async (): Promise<void> => graphMenus.openFolderMenu('apps'));

      await test.step('AND the canvas background is clicked', async (): Promise<void> => graphCanvas.tapBackground());

      await test.step('THEN the menu is gone, the apps "…" holds no focus and draws no ring', async (): Promise<void> =>
        graphMenus.expectFocusLeftEllipsis('apps'));
    }
  );

  test(
    'GIVEN the apps "…" menu, a click on Fit closes it and leaves focus on Fit',
    { annotation: C9 },
    async ({ graphFolderInspect, graphMenus, graphPage }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the apps "…" is pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphMenus.openFolderMenu('apps');
      });

      await test.step('AND Fit is clicked', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

      await test.step('THEN the menu is gone and focus is on Fit', async (): Promise<void> => {
        await graphMenus.expectNoMenu();
        await graphPage.expectButtonFocused(FIT_LABEL);
      });
    }
  );

  test(
    'GIVEN the apps menu, Collapse and Expand leave the folder as the list header button does',
    { annotation: C9 },
    async ({ graphFolderInspect, graphFolders, graphGrouping, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open and Collapse is chosen from the apps menu', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphMenus.openFolderMenu('apps');
        await graphMenus.item('Collapse').click();
      });

      await test.step('THEN apps is collapsed and its list header button reads Expand', async (): Promise<void> => {
        await graphGrouping.expectFolderCollapsed('apps', true);
        await graphFolders.expectListToggle('apps', false);
      });

      await test.step('WHEN Expand is chosen from the apps menu, named for apps on the collapsed node', async (): Promise<void> => {
        await graphMenus.openFolderMenu('apps');
        await graphMenus.expectFolderMenuNamed('apps');
        await graphMenus.item('Expand').click();
      });

      await test.step('THEN apps is expanded and its list header button reads Collapse', async (): Promise<void> => {
        await graphGrouping.expectFolderCollapsed('apps', false);
        await graphFolders.expectListToggle('apps', true);
      });

      await test.step('WHEN the list header button collapses apps', async (): Promise<void> =>
        graphFolders.toggleInList('apps', true));

      await test.step('THEN apps is collapsed just as after the menu item', async (): Promise<void> =>
        graphGrouping.expectFolderCollapsed('apps', true));
    }
  );

  test(
    'GIVEN the apps menu, Focus folder shows what the details panel button shows, and the item then reads Clear focus',
    { annotation: C9 },
    async ({ graphCamera, graphFolderInspect, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open and Focus folder is chosen from the apps menu', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphMenus.openFolderMenu('apps');
        await graphMenus.item('Focus folder').click();
      });

      await test.step('THEN only the apps packages are visible', async (): Promise<void> => graphCamera.expectVisible(APPS_PACKAGES));

      await test.step('AND the apps menu now offers Clear focus in place of Focus folder', async (): Promise<void> => {
        await graphMenus.openFolderMenu('apps');
        await graphMenus.expectItems(['Collapse', 'Clear focus', 'Exclude folder']);
      });

      await test.step('WHEN Clear focus is chosen', async (): Promise<void> => graphMenus.item('Clear focus').click());

      await test.step('THEN every package is visible again', async (): Promise<void> => graphCamera.expectVisible(ALL_PACKAGES));

      await test.step('WHEN apps is tapped and the details panel Focus folder is pressed', async (): Promise<void> => {
        await graphFolderInspect.tapFolder('apps');
        await graphFolderInspect.pressAction('Focus folder');
      });

      await test.step('THEN the same apps packages are visible', async (): Promise<void> => graphCamera.expectVisible(APPS_PACKAGES));
    }
  );

  test(
    'GIVEN the apps menu, Exclude folder, then Show all in folder after docs is unticked in the list, and choosing it ticks every package',
    { annotation: C9 },
    async ({ graphFolderInspect, graphList, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the apps menu opens', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphMenus.openFolderMenu('apps');
      });

      await test.step('THEN Exclude folder shows the eye-closed icon, as the apps group checkbox is checked', async (): Promise<void> => {
        await graphMenus.expectItemIcon('Exclude folder', 'eye-closed');
        await graphList.expectGroupChecked('apps (2)', true);
      });

      await test.step('WHEN Escape closes the menu, docs is unticked in the list and the menu opens again', async (): Promise<void> => {
        await graphMenus.pressKey('Escape');
        await graphList.toggleRow('docs');
        await graphMenus.openFolderMenu('apps');
      });

      await test.step('THEN Show all in folder shows the eye icon, as the apps group checkbox is mixed', async (): Promise<void> => {
        await graphMenus.expectItemIcon('Show all in folder', 'eye');
        await graphList.expectGroupMixed('apps (2)');
      });

      await test.step('WHEN Show all in folder is chosen', async (): Promise<void> => graphMenus.item('Show all in folder').click());

      await test.step('THEN docs is ticked again and the group checkbox is checked', async (): Promise<void> => {
        await graphList.expectRowChecked('docs', true);
        await graphList.expectGroupChecked('apps (2)', true);
      });
    }
  );

  test(
    'GIVEN a folder held by a trace ghost with its only package unticked, the menu offers Show all in folder, as its group checkbox is unchecked',
    { annotation: C9 },
    async ({ graphCanvas, graphFolderInspect, graphList, graphMenus, graphPage }): Promise<void> => {
      const saved = savedWith(GHOSTS.hash, { hidden: ['m'], trace: TRACE_THROUGH_MID });

      await test.step('WHEN the page opens grouped with m unticked and a trace from a to b', async (): Promise<void> =>
        graphFolderInspect.open(saved, GHOSTS));

      await test.step('AND Fit widens the lone-package boxes past 120 px', async (): Promise<void> => {
        await graphPage.pressButton(FIT_LABEL);
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('AND the mid menu opens', async (): Promise<void> => graphMenus.openFolderMenu('mid'));

      await test.step('THEN Show all in folder is offered, as the mid group checkbox is unchecked', async (): Promise<void> => {
        await graphMenus.expectItems(['Collapse', 'Focus folder', 'Show all in folder']);
        await graphList.expectGroupChecked('mid (1)', false);
      });

      await test.step('WHEN Show all in folder is chosen', async (): Promise<void> => graphMenus.item('Show all in folder').click());

      await test.step('THEN m is ticked', async (): Promise<void> => graphList.expectRowChecked('m', true));
    }
  );

  test(
    'GIVEN a folder whose only package is focused, Exclude folder is disabled and does nothing, as its group checkbox is',
    { annotation: C9 },
    async ({ graphCanvas, graphFolderInspect, graphList, graphMenus, graphPage }): Promise<void> => {
      await test.step('WHEN the page opens grouped and Fit widens the lone-package boxes past 120 px', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(GHOSTS.hash, {}), GHOSTS);
        await graphPage.pressButton(FIT_LABEL);
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('AND a is focused in the list', async (): Promise<void> => graphList.focusOn('a'));

      await test.step('THEN the x group checkbox is checked and locked', async (): Promise<void> =>
        graphList.expectGroupLocked('x (1)'));

      await test.step('WHEN the x menu opens', async (): Promise<void> => graphMenus.openFolderMenu('x'));

      await test.step('THEN Exclude folder is disabled', async (): Promise<void> =>
        graphMenus.expectItemDisabled('Exclude folder', true));

      await test.step('WHEN Exclude folder is pressed', async (): Promise<void> => graphMenus.pressDisabledItem('Exclude folder'));

      await test.step('THEN a stays ticked and the menu stays open', async (): Promise<void> => {
        await graphList.expectRowChecked('a', true);
        await graphMenus.expectItemDisabled('Exclude folder', true);
      });
    }
  );

  test(
    'GIVEN a picked package, its "…" menu opens details, starts a trace and excludes it as the panel and list do',
    { annotation: C9 },
    async ({ graphDetails, graphFolderInspect, graphHost, graphList, graphMenus, graphTrace }): Promise<void> => {
      await test.step('WHEN the grouped boards open, web is picked and its "…" is pressed', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphList.pick('web');
        await graphMenus.openPackageMenu('web');
      });

      await test.step('THEN the menu is named for web and lists View Package Details, Focus, Start trace and Exclude', async (): Promise<void> => {
        await graphMenus.expectPackageMenuNamed('web');
        await graphMenus.expectItems(['View Package Details', 'Focus', 'Start trace', 'Exclude']);
      });

      await test.step('WHEN View Package Details is chosen', async (): Promise<void> =>
        graphMenus.item('View Package Details').click());

      await test.step('THEN the host got one openDetails for web', async (): Promise<void> => graphHost.expectOpenDetails('web'));

      await test.step('WHEN Start trace is chosen from the menu', async (): Promise<void> => {
        await graphMenus.openPackageMenu('web');
        await graphMenus.item('Start trace').click();
      });

      await test.step('THEN picking starts from web', async (): Promise<void> => graphTrace.expectPicking('web'));

      await test.step('WHEN picking is cancelled and the details panel Start trace is pressed', async (): Promise<void> => {
        await graphTrace.cancel();
        await graphDetails.startTrace();
      });

      await test.step('THEN picking starts from web the same way', async (): Promise<void> => graphTrace.expectPicking('web'));

      await test.step('WHEN picking is cancelled and Exclude is chosen from the menu', async (): Promise<void> => {
        await graphTrace.cancel();
        await graphMenus.openPackageMenu('web');
        await graphMenus.item('Exclude').click();
      });

      await test.step('THEN web is unticked in the list', async (): Promise<void> => graphList.expectRowChecked('web', false));

      await test.step('WHEN web is ticked in the list', async (): Promise<void> => graphList.toggleRow('web'));

      await test.step('THEN web is ticked', async (): Promise<void> => graphList.expectRowChecked('web', true));
    }
  );

  test(
    'GIVEN the apps folder selected and the container focused, Shift+F10 opens the page menu and no native one',
    { annotation: C9 },
    async ({ graphFolderInspect, graphMenus, graphWidgets }): Promise<void> => {
      // eslint-disable-next-line playwright/no-skipped-test -- macOS Chromium never fires the event this test watches
      test.skip(IS_SHIFT_F10_SILENT, SHIFT_F10_SILENT_REASON);

      await test.step('WHEN the grouped boards open, apps is tapped and the container is focused', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('apps');
        await graphWidgets.focusContainer();
        await graphMenus.recordContextMenus();
      });

      await test.step('AND Shift+F10 is pressed', async (): Promise<void> => graphMenus.pressShiftF10());

      await test.step('THEN the apps menu opens', async (): Promise<void> => graphMenus.expectItems(FOLDER_ITEMS));

      await test.step('AND every contextmenu event was prevented and no other menu is open', async (): Promise<void> =>
        graphMenus.expectNoNativeContextMenu());
    }
  );
});
