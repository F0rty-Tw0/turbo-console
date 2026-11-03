import { expect } from '@playwright/test';

import { test } from './graph.fixture.ts';
import { BOARD_FOLDER_KEYS, boardsState } from './test/utils/graph-boards.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';
import { edgeIdOf } from '../src/graph/utils/edge-id.util.ts';

const BOARDS = boardsState();

const BOARD_EDGE_IDS = BOARDS.edges.map(edgeIdOf).toSorted();

test.describe('FEATURE: edge routes beside the positions', () => {
  test('GIVEN the boards graph laid out by ELK WHEN the page posts its layout THEN it posts one route per package edge', async ({
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the boards state is sent', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(BOARDS);
      await graphProbe.expectLayoutEngine('elk');
    });

    const { routes } = await graphGrouping.postedLayout();

    expect(Object.keys(routes).toSorted()).toStrictEqual(BOARD_EDGE_IDS);
  });

  test('GIVEN the posted folders layout WHEN the page is reopened with it cached THEN the page accepts the routes and draws from the cache', async ({
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('GIVEN the boards graph is laid out by ELK and grouped by folder', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(BOARDS);
      await graphProbe.expectLayoutEngine('elk');
      await graphGrouping.setGrouped(true);
      await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
      await graphGrouping.expectPostedGrouping('folders');
    });

    const { positions, routes } = await graphGrouping.postedLayout();
    const cached: GraphReady = { ...BOARDS, folderPositions: positions, folderRoutes: routes };

    await test.step('WHEN the page is reopened with the saved view and the layout cached', async (): Promise<void> => {
      await graphHost.expectViewSaved();
      await graphHost.reopen();
      await graphHost.sendState(cached);
    });

    await test.step('THEN the layout comes from the cache', async (): Promise<void> => graphProbe.expectLayoutEngine('cache'));
  });
});
