import { LARGE_PACKAGE_COUNT } from './common/graph.const.ts';
import { test } from './graph.fixture.ts';
import { bothCachedBoardsState } from './test/utils/graph-boards.spec.util.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';

const C4 = { description: 'M4-4 C4', type: 'requirement' };

const BOARDS = bothCachedBoardsState();

const LARGE_300 = largeState(LARGE_PACKAGE_COUNT);

const LARGE_301 = largeState(LARGE_PACKAGE_COUNT + 1);

const UNCACHED_300: GraphReady = { ...LARGE_300, positions: null };

const UNCACHED_301: GraphReady = { ...LARGE_301, positions: null };

const GROUP_COUNT = 30;

const GROUP_FOLDERS = Array.from({ length: GROUP_COUNT }, (_, index): string => `group-${index}`);

test.describe('FEATURE: folder header toggle', () => {
  test('GIVEN the boards graph, the header buttons appear with Group by folder and collapse and expand their folder', async ({
    graphGrouping,
    graphHost,
    graphList,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the boards graph is sent flat', async (): Promise<void> => graphHost.sendState(BOARDS));

    await test.step('THEN no header has a button', async (): Promise<void> => graphList.expectNoFolderToggles());

    await test.step('WHEN Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

    await test.step('THEN apps reads Collapse and is expanded', async (): Promise<void> =>
      graphList.expectFolderToggle('Collapse folder apps', 'Collapse', true));

    await test.step('WHEN the apps button is pressed', async (): Promise<void> => graphList.pressFolderToggle('Collapse folder apps'));

    await test.step('THEN apps is collapsed and its button reads Expand', async (): Promise<void> => {
      await graphGrouping.expectFolderCollapsed('apps', true);
      await graphList.expectFolderToggle('Expand folder apps', 'Expand', false);
    });

    await test.step('AND packages is still expanded', async (): Promise<void> => {
      await graphGrouping.expectFolderCollapsed('packages', false);
      await graphList.expectFolderToggle('Collapse folder packages', 'Collapse', true);
    });

    await test.step('WHEN the apps button is pressed again', async (): Promise<void> =>
      graphList.pressFolderToggle('Expand folder apps'));

    await test.step('THEN apps is expanded again', async (): Promise<void> => {
      await graphGrouping.expectFolderCollapsed('apps', false);
      await graphList.expectFolderToggle('Collapse folder apps', 'Collapse', true);
    });

    await test.step('WHEN Group by folder is unchecked', async (): Promise<void> => graphGrouping.setGrouped(false));

    await test.step('THEN the header buttons are gone', async (): Promise<void> => graphList.expectNoFolderToggles());
  });

  test('GIVEN apps collapsed, reopening restores it collapsed, and it stays collapsed while flat', async ({
    graphGrouping,
    graphHost,
    graphList,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the boards graph is sent and grouped', async (): Promise<void> => {
      await graphHost.sendState(BOARDS);
      await graphGrouping.setGrouped(true);
    });

    await test.step('AND apps is collapsed, then Group by folder is unchecked', async (): Promise<void> => {
      await graphList.pressFolderToggle('Collapse folder apps');
      await graphGrouping.expectFolderCollapsed('apps', true);
      await graphGrouping.expectCollapsedSaved(['apps']);
      await graphGrouping.setGrouped(false);
      await graphGrouping.expectGroupedSaved(false);
    });

    await test.step('AND the page is reopened with the saved view and the state is sent', async (): Promise<void> => {
      await graphHost.reopen();
      await graphHost.sendState(BOARDS);
    });

    await test.step('THEN the page is flat with no header button', async (): Promise<void> => graphList.expectNoFolderToggles());

    await test.step('WHEN Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

    await test.step('THEN apps is still collapsed and packages is not', async (): Promise<void> => {
      await graphGrouping.expectFolderCollapsed('apps', true);
      await graphGrouping.expectFolderCollapsed('packages', false);
      await graphList.expectFolderToggle('Expand folder apps', 'Expand', false);
    });
  });

  test('GIVEN the grouped boards list, the keyboard reaches the header button and Enter collapses the folder', async ({
    graphGrouping,
    graphHost,
    graphKeys,
    graphList,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the boards graph is sent and grouped', async (): Promise<void> => {
      await graphHost.sendState(BOARDS);
      await graphGrouping.setGrouped(true);
    });

    await test.step('AND the apps group checkbox is reached by Tab', async (): Promise<void> => graphKeys.tabTo('apps (2)'));

    await test.step('THEN the list is one Tab stop', async (): Promise<void> => graphKeys.expectListTabStops(1));

    await test.step('WHEN ArrowRight is pressed', async (): Promise<void> => graphKeys.press('ArrowRight'));

    await test.step('THEN the apps header button holds focus', async (): Promise<void> =>
      graphKeys.expectFocusedName('Collapse folder apps'));

    await test.step('WHEN Enter is pressed', async (): Promise<void> => graphKeys.press('Enter'));

    await test.step('THEN apps is collapsed, the button reads Expand and keeps focus', async (): Promise<void> => {
      await graphGrouping.expectFolderCollapsed('apps', true);
      await graphList.expectFolderToggle('Expand folder apps', 'Expand', false);
      await graphKeys.expectFocusedName('Expand folder apps');
    });

    await test.step('WHEN ArrowDown is pressed THEN focus lands on the first name button of the group', async (): Promise<void> => {
      await graphKeys.press('ArrowDown');
      await graphKeys.expectFocusedName('docs');
    });

    await test.step('AND the list is still one Tab stop', async (): Promise<void> => graphKeys.expectListTabStops(1));
  });

  test('GIVEN focus on a header button, unchecking Group by folder leaves the list reachable by Tab', async ({
    graphGrouping,
    graphHost,
    graphKeys,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the boards graph is sent and grouped', async (): Promise<void> => {
      await graphHost.sendState(BOARDS);
      await graphGrouping.setGrouped(true);
    });

    await test.step('AND focus is on the apps header button', async (): Promise<void> => {
      await graphKeys.tabTo('apps (2)');
      await graphKeys.press('ArrowRight');
      await graphKeys.expectFocusedName('Collapse folder apps');
    });

    await test.step('AND Group by folder is unchecked by keyboard', async (): Promise<void> => {
      await graphKeys.shiftTabTo('Group by folder');
      await graphKeys.press('Space');
      await graphGrouping.expectGrouped(false);
    });

    await test.step('THEN the list is one Tab stop and Tab reaches the first group checkbox again', async (): Promise<void> => {
      await graphKeys.expectListTabStops(1);
      await graphKeys.tabTo('apps (2)');
    });
  });

  test(
    'GIVEN more than 300 packages and nothing saved, the graph opens grouped with every folder collapsed and in view',
    { annotation: C4 },
    async ({ graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a 301-package graph is sent', async (): Promise<void> =>
        graphHost.sendState(largeState(LARGE_PACKAGE_COUNT + 1)));

      await test.step('THEN the graph is laid out, by ELK or by the fallback on a slow runner', async (): Promise<void> =>
        graphProbe.expectLayoutSettled());

      await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.expectGrouped(true));

      await test.step('AND all 30 folders are collapsed', async (): Promise<void> => {
        await graphGrouping.expectFolderKeys(GROUP_FOLDERS);

        for (const folder of GROUP_FOLDERS) await graphGrouping.expectFolderCollapsed(folder, true);
      });

      await test.step('AND the collapsed folders are in view', async (): Promise<void> =>
        graphGrouping.expectBoxesInView(GROUP_COUNT));
    }
  );

  test(
    'GIVEN exactly 300 packages and nothing saved, the graph opens flat',
    { annotation: C4 },
    async ({ graphGrouping, graphHost, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a 300-package graph is sent', async (): Promise<void> =>
        graphHost.sendState(largeState(LARGE_PACKAGE_COUNT)));

      await test.step('THEN Group by folder is unchecked and no box is drawn', async (): Promise<void> => {
        await graphGrouping.expectGrouped(false);
        await graphGrouping.expectFolderCount(0);
      });
    }
  );

  test(
    'GIVEN a 300-package graph still laying out, a 301-package graph sent next opens flat',
    { annotation: C4 },
    async ({ graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND two graphs with no cached layout are sent back to back', async (): Promise<void> =>
        graphHost.sendStates([UNCACHED_300, UNCACHED_301]));

      await test.step('THEN the second one is laid out, by ELK or by the fallback on a slow runner', async (): Promise<void> =>
        graphProbe.expectLayoutSettled());

      await test.step('AND Group by folder is unchecked and no box is drawn', async (): Promise<void> => {
        await graphGrouping.expectGrouped(false);
        await graphGrouping.expectFolderCount(0);
      });
    }
  );
});
