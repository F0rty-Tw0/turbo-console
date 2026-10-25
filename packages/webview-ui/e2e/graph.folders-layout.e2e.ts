import { LARGE_PACKAGE_COUNT } from './common/graph.const.ts';
import { test } from './graph.fixture.ts';
import {
  BOARDS_FOLDER_POSITIONS,
  BOARD_FOLDER_KEYS,
  PACKAGES_FOLDER_MEMBERS,
  boardsState,
  cachedBoardsState,
  taggedBoardsState
} from './test/utils/graph-boards.spec.util.ts';
import { largeState } from './test/utils/graph-large.spec.util.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { targetLikeState } from './test/utils/graph-target-like.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';

const C1 = { description: 'M4-4 C1', type: 'requirement' };

const C6 = { description: 'M4-4 C6', type: 'requirement' };

const C7 = { description: 'M4-4 C7', type: 'requirement' };

const GROUP_FOLDERS = Array.from({ length: 30 }, (_, index): string => `group-${index}`);

const CACHED_BOARDS = cachedBoardsState();

const TAGGED = taggedBoardsState();

const TAGGED_BOARDS: GraphReady = { ...TAGGED, folderPositions: BOARDS_FOLDER_POSITIONS };

test.describe('FEATURE: grouped graph layout', () => {
  test(
    'GIVEN the boards graph, Group by folder draws one box per folder around its packages',
    { annotation: C1 },
    async ({ graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the boards graph is sent and laid out flat', async (): Promise<void> => {
        await graphHost.sendState(boardsState());
        await graphProbe.expectLayoutEngine('elk');
      });

      await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN the page is grouped with a box for apps and one for packages', async (): Promise<void> => {
        await graphGrouping.expectGrouped(true);
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
      });

      await test.step('AND each box surrounds its packages and no other', async (): Promise<void> =>
        graphGrouping.expectBoxesAroundPackages());

      await test.step('AND the boxes do not overlap', async (): Promise<void> => graphGrouping.expectNoBoxOverlap());

      await test.step('AND no notice is shown', async (): Promise<void> => graphGrouping.expectNotice(null));
    }
  );

  test(
    'GIVEN a graph whose packages share one folder, Group by folder draws one box around all of them',
    { annotation: C1 },
    async ({ graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the 14-package target-like graph is sent', async (): Promise<void> => {
        await graphHost.sendState(targetLikeState());
        await graphProbe.expectLayoutEngine('elk');
      });

      await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN there is one box, packages, with all 14 packages', async (): Promise<void> => {
        await graphGrouping.expectFolderKeys(['packages']);
        await graphGrouping.expectFolderPackages('packages', stateNamesOf(targetLikeState()));
      });

      await test.step('AND the box surrounds them', async (): Promise<void> => graphGrouping.expectBoxesAroundPackages());
    }
  );

  test(
    'GIVEN 300 packages in 30 folders, Group by folder draws 30 boxes that surround their packages and do not overlap',
    { annotation: C1 },
    async ({ graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the 300-package graph is sent', async (): Promise<void> => {
        await graphHost.sendState(largeState(LARGE_PACKAGE_COUNT));
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN the grouped layout has finished', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND there is a box for each of group-0 to group-29', async (): Promise<void> =>
        graphGrouping.expectFolderKeys(GROUP_FOLDERS));

      await test.step('AND each box surrounds its packages and no other', async (): Promise<void> =>
        graphGrouping.expectBoxesAroundPackages());

      await test.step('AND the boxes do not overlap', async (): Promise<void> => graphGrouping.expectNoBoxOverlap());
    }
  );

  test(
    'GIVEN a hand-moved flat layout, grouping and ungrouping brings the flat positions back and removes every box',
    { annotation: C7 },
    async ({ graphCanvas, graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the boards graph is sent with its flat layout cached', async (): Promise<void> => {
        await graphHost.sendState(CACHED_BOARDS);
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('AND web is dragged by 60 px right and 40 px down', async (): Promise<void> => {
        await graphCanvas.dragNode('web', 60, 40);
        await graphCanvas.expectDragPosted();
      });

      const before = await graphGrouping.modelPositions();

      await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN the boxes are drawn', async (): Promise<void> => {
        await graphGrouping.expectGrouped(true);
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
      });

      await test.step('WHEN Group by folder is unchecked', async (): Promise<void> => graphGrouping.setGrouped(false));

      await test.step('THEN every package is back where it was before grouping', async (): Promise<void> =>
        graphGrouping.expectPositionsEqual(before));

      await test.step('AND no box remains', async (): Promise<void> => graphGrouping.expectFolderCount(0));
    }
  );

  test(
    'GIVEN a package is selected, grouping keeps every package opacity, every box normal, and a hidden package leaves its box',
    { annotation: C6 },
    async ({ graphCanvas, graphGrouping, graphHost, graphList, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the boards graph is sent with its flat layout cached', async (): Promise<void> => {
        await graphHost.sendState(CACHED_BOARDS);
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('AND web is tapped', async (): Promise<void> => {
        await graphCanvas.tapNode('web');
        await graphProbe.expectSelected('web');
      });

      const opacitiesFlat = await graphGrouping.packageOpacities();

      await test.step('AND Group by folder is checked', async (): Promise<void> => {
        await graphGrouping.setGrouped(true);
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
      });

      await test.step('THEN every package has the opacity it had flat', async (): Promise<void> =>
        graphGrouping.expectOpacities(opacitiesFlat));

      await test.step('AND every box is normal', async (): Promise<void> => graphGrouping.expectFolderStates('normal'));

      await test.step('WHEN the @acme/ui row is unchecked', async (): Promise<void> => graphList.toggleRow('@acme/ui'));

      await test.step('THEN the other four packages stay visible', async (): Promise<void> =>
        graphGrouping.expectVisibleIds(['@acme/config', '@acme/utils', 'docs', 'web']));

      await test.step('AND the packages box still lists its three members', async (): Promise<void> =>
        graphGrouping.expectFolderPackages('packages', PACKAGES_FOLDER_MEMBERS));
    }
  );

  test(
    'GIVEN a tag filter, the same packages stay visible grouped and each box shrinks to its drawn packages',
    { annotation: C6 },
    async ({ graphControls, graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the tagged boards graph is sent with both layouts cached', async (): Promise<void> => {
        await graphHost.sendState(TAGGED_BOARDS);
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('AND the ui tag is ticked', async (): Promise<void> => graphControls.toggleTag('ui'));

      const visibleFlat = await graphGrouping.visibleIds();

      await test.step('AND the ui tag is unticked and Group by folder is checked', async (): Promise<void> => {
        await graphControls.toggleTag('ui');
        await graphGrouping.setGrouped(true);
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
        await graphGrouping.expectBoxesAroundPackages();
      });

      await test.step('AND the ui tag is ticked again', async (): Promise<void> => graphControls.toggleTag('ui'));

      await test.step('THEN the visible packages are the ones that were visible flat', async (): Promise<void> =>
        graphGrouping.expectVisibleIds(visibleFlat));

      await test.step('AND the apps and packages boxes shrank to their drawn packages', async (): Promise<void> => {
        await graphGrouping.expectOutsideBox('docs', 'apps');
        await graphGrouping.expectOutsideBox('@acme/config', 'packages');
      });

      await test.step('AND each box still lists all of its members', async (): Promise<void> => {
        await graphGrouping.expectFolderPackages('apps', ['docs', 'web']);
        await graphGrouping.expectFolderPackages('packages', PACKAGES_FOLDER_MEMBERS);
      });
    }
  );
});
