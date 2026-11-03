import { test } from './graph-routes.fixture.ts';
import { BOARD_FOLDER_KEYS, boardsState } from './test/utils/graph-boards.spec.util.ts';
import { edgeIdOf } from '../src/graph/utils/edge-id.util.ts';

const BOARDS = boardsState();

const BOARD_EDGE_IDS = BOARDS.edges.map(edgeIdOf);

test.describe('FEATURE: edge routes beside the positions', () => {
  test('GIVEN the boards graph laid out by ELK, the page posts one route per package edge', async ({
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened and the boards state is sent', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(BOARDS);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('THEN the posted routes are exactly the package edges', async (): Promise<void> =>
      graphRoutes.expectPostedRouteIds(BOARD_EDGE_IDS));
  });

  test('GIVEN the boards graph grouped by folder, a reopen with its posted layout cached draws from the cache', async ({
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened and the boards state is sent', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(BOARDS);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('AND Group by folder is checked', async (): Promise<void> => {
      await graphGrouping.setGrouped(true);
      await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
    });

    await test.step('AND the folders layout is posted', async (): Promise<void> => graphGrouping.expectPostedGrouping('folders'));

    await test.step('AND the page is reopened with that layout cached', async (): Promise<void> =>
      graphRoutes.reopenWithPostedFoldersCached(BOARDS));

    await test.step('THEN the layout comes from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));
  });
});
