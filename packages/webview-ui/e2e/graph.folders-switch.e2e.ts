import { test } from './graph.fixture.ts';
import {
  BOARDS_FLAT_POSITIONS,
  BOARD_FOLDER_KEYS,
  boardsState,
  bothCachedBoardsState,
  cachedBoardsState
} from './test/utils/graph-boards.spec.util.ts';
import { packageOf, stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';
import { LAYING_OUT_FOLDERS_TEXT } from '../src/graph/common/graph.const.ts';

const C3 = { description: 'M4-4 C3', type: 'requirement' };

const C8 = { description: 'M4-4 C8', type: 'requirement' };

const RF1 = { description: 'M4-4 Review Focus 1', type: 'requirement' };

const RF2 = { description: 'M4-4 Review Focus 2', type: 'requirement' };

const OTHER_HASH = 'b0a2d501';

const BOARDS = boardsState();

const CACHED_BOARDS = cachedBoardsState();

const BOTH_CACHED_BOARDS = bothCachedBoardsState();

const EXTRA_PACKAGES = [...BOARDS.packages, packageOf('@acme/extra', 'packages/extra')];

const OTHER_HASH_BOARDS: GraphReady = { ...BOARDS, hash: OTHER_HASH, packages: EXTRA_PACKAGES };

test.describe('FEATURE: grouped graph switching', () => {
  test(
    'GIVEN a grouped layout still running, switching modes back and forth reuses the run and keeps the flat drawing usable',
    { annotation: RF1 },
    async ({ graphCanvas, graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with held workers', async (): Promise<void> => graphPage.open({ workers: 'held' }));

      await test.step('AND the boards graph is sent with its flat layout cached', async (): Promise<void> => {
        await graphHost.sendState(CACHED_BOARDS);
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('AND Group by folder is checked and the notice has resized the canvas', async (): Promise<void> => {
        await graphGrouping.setGrouped(true);
        await graphGrouping.expectNotice(LAYING_OUT_FOLDERS_TEXT);
        await graphGrouping.expectCanvasFitsContainer();
      });

      await test.step('AND docs is dragged while the grouped layout waits', async (): Promise<void> =>
        graphCanvas.dragNode('docs', 30, 30));

      await test.step('AND Group by folder is unchecked and checked again', async (): Promise<void> => {
        await graphGrouping.setGrouped(false);
        await graphGrouping.setGrouped(true);
      });

      await test.step('THEN the notice says the folders are being laid out and the toolbar stays', async (): Promise<void> => {
        await graphGrouping.expectNotice(LAYING_OUT_FOLDERS_TEXT);
        await graphGrouping.expectToolbarShown();
      });

      await test.step('AND no box is drawn yet', async (): Promise<void> => graphGrouping.expectFolderCount(0));

      await test.step('AND the drag posted flat positions', async (): Promise<void> => graphGrouping.expectPostedGroupings(['flat']));

      await test.step('AND one worker ran the grouped layout and none was terminated', async (): Promise<void> => {
        await graphHost.expectWorkers(1);
        await graphHost.expectTerminated(0);
      });

      await test.step('WHEN the held worker is released', async (): Promise<void> => graphGrouping.releaseWorker());

      await test.step('THEN the boxes are drawn and the notice is gone', async (): Promise<void> => {
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
        await graphGrouping.expectNotice(null);
      });

      await test.step('AND the last post is the grouped layout, from ELK', async (): Promise<void> => {
        await graphGrouping.expectPostedGrouping('folders');
        await graphProbe.expectLayoutEngine('elk');
      });
    }
  );

  test(
    'GIVEN a grouped layout that lands after the switch back to flat, it is stored and changes nothing on screen',
    { annotation: RF1 },
    async ({ graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with held workers', async (): Promise<void> => graphPage.open({ workers: 'held' }));

      await test.step('AND the boards graph is sent with its flat layout cached', async (): Promise<void> => {
        await graphHost.sendState(CACHED_BOARDS);
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('AND Group by folder is checked and unchecked', async (): Promise<void> => {
        await graphGrouping.setGrouped(true);
        await graphGrouping.setGrouped(false);
      });

      await test.step('THEN the notice is hidden at the switch back', async (): Promise<void> => graphGrouping.expectNotice(null));

      await test.step('WHEN the held worker is released', async (): Promise<void> => graphGrouping.releaseWorker());

      await test.step('THEN the grouped layout is posted for the cache', async (): Promise<void> =>
        graphGrouping.expectPostedGroupings(['folders']));

      await test.step('AND no box is drawn, the flat positions stay and the notice stays hidden', async (): Promise<void> => {
        await graphGrouping.expectFolderCount(0);
        await graphGrouping.expectPositionsEqual(BOARDS_FLAT_POSITIONS);
        await graphGrouping.expectNotice(null);
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('WHEN Group by folder is checked again', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN the stored layout draws the boxes at once, with no second worker', async (): Promise<void> => {
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
        await graphHost.expectWorkers(1);
        await graphProbe.expectLayoutEngine('elk');
      });
    }
  );

  test(
    'GIVEN a grouped layout still running, Re-layout restarts the grouped layout and the boxes are placed once',
    { annotation: RF2 },
    async ({ graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with held workers', async (): Promise<void> => graphPage.open({ workers: 'held' }));

      await test.step('AND the boards graph is sent with its flat layout cached', async (): Promise<void> => {
        await graphHost.sendState(CACHED_BOARDS);
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('AND Group by folder is checked and Re-layout is pressed', async (): Promise<void> => {
        await graphGrouping.setGrouped(true);
        await graphPage.pressButton('Re-layout');
      });

      await test.step('THEN the checkbox stays checked and the notice stays', async (): Promise<void> => {
        await graphGrouping.expectGrouped(true);
        await graphGrouping.expectNotice(LAYING_OUT_FOLDERS_TEXT);
      });

      await test.step('AND the flat drawing is still shown, with no box', async (): Promise<void> => {
        await graphProbe.expectNodesAt(BOARDS_FLAT_POSITIONS);
        await graphGrouping.expectFolderCount(0);
      });

      await test.step('AND the first grouped run was dropped for the second', async (): Promise<void> => {
        await graphHost.expectWorkers(2);
        await graphHost.expectTerminated(1);
      });

      await test.step('WHEN the held worker is released', async (): Promise<void> => graphGrouping.releaseWorker());

      await test.step('THEN the boxes are drawn and the notice is gone', async (): Promise<void> => {
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
        await graphGrouping.expectNotice(null);
      });

      await test.step('AND only a grouped layout was posted, from ELK', async (): Promise<void> => {
        await graphGrouping.expectPostedGroupings(['folders']);
        await graphProbe.expectLayoutEngine('elk');
      });
    }
  );

  test(
    'GIVEN Group by folder checked, reopening restores it from the grouped cache, and a new hash is laid out grouped',
    { annotation: [C3, C8] },
    async ({ graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the boards graph is sent with its flat layout cached', async (): Promise<void> => {
        await graphHost.sendState(CACHED_BOARDS);
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('AND Group by folder is checked and the boxes are drawn', async (): Promise<void> => {
        await graphGrouping.setGrouped(true);
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
      });

      const posted = await graphGrouping.postedPositions();
      const folderCache: GraphReady = { ...BOARDS, folderPositions: posted };

      await test.step('AND the page is reopened with its saved view and the grouped cache is sent', async (): Promise<void> => {
        await graphHost.expectViewSaved();
        await graphHost.reopen();
        await graphHost.sendState(folderCache);
      });

      await test.step('THEN the checkbox is checked and the boxes are drawn from the cache', async (): Promise<void> => {
        await graphGrouping.expectGrouped(true);
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('AND no worker was created', async (): Promise<void> => graphHost.expectWorkers(0));

      await test.step('WHEN a graph with another hash and one more package is sent', async (): Promise<void> =>
        graphHost.sendState(OTHER_HASH_BOARDS));

      await test.step('THEN grouping is kept and the boxes are drawn from a new layout', async (): Promise<void> => {
        await graphGrouping.expectGrouped(true);
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
        await graphProbe.expectLayoutEngine('elk');
      });

      await test.step('AND the grouped layout of the new hash was posted', async (): Promise<void> => {
        await graphGrouping.expectPostedGrouping('folders');
        await graphHost.expectPositionsPosted(OTHER_HASH, stateNamesOf(OTHER_HASH_BOARDS));
      });
    }
  );

  test(
    'GIVEN Group by folder checked while its layout still runs, the saved view already holds it and reopening draws it grouped',
    { annotation: C8 },
    async ({ graphGrouping, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened with held workers', async (): Promise<void> => graphPage.open({ workers: 'held' }));

      await test.step('AND the boards graph is sent with its flat layout cached', async (): Promise<void> => {
        await graphHost.sendState(CACHED_BOARDS);
        await graphProbe.expectLayoutEngine('cache');
      });

      await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN the saved view holds Group by folder checked', async (): Promise<void> =>
        graphGrouping.expectGroupedSaved(true));

      await test.step('WHEN the page is reopened and the boards graph is sent with both layouts cached', async (): Promise<void> => {
        await graphHost.reopen();
        await graphHost.sendState(BOTH_CACHED_BOARDS);
      });

      await test.step('THEN the page is grouped from the cache', async (): Promise<void> => {
        await graphGrouping.expectGrouped(true);
        await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
        await graphProbe.expectLayoutEngine('cache');
      });
    }
  );
});
