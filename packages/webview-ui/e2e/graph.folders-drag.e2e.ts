import { test } from './graph.fixture.ts';
import { BOARD_FOLDER_KEYS, bothCachedBoardsState } from './test/utils/graph-boards.spec.util.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const BOTH_CACHED = bothCachedBoardsState();

test.describe('FEATURE: grouped graph boxes on the canvas', () => {
  test('GIVEN the grouped boards, dragging the three-package box posts its positions once', async ({
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the boards graph is sent with both layouts cached', async (): Promise<void> => {
      await graphHost.sendState(BOTH_CACHED);
      await graphProbe.expectLayoutEngine('cache');
    });

    await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

    await test.step('THEN the boxes are drawn from the cache and nothing is posted', async (): Promise<void> => {
      await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
      await graphGrouping.expectPostedGroupings([]);
    });

    await test.step('WHEN the packages box is dragged by 60 px right and 40 px down', async (): Promise<void> =>
      graphGrouping.dragBox('packages', 60, 40));

    await test.step('THEN exactly one positions message is posted, for folders', async (): Promise<void> =>
      graphGrouping.expectPostedGroupings(['folders']));
  });

  test('GIVEN the grouped boards, the switch and Fit frame every box inside the canvas', async ({
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

    await test.step('AND the boards graph is sent with both layouts cached', async (): Promise<void> => {
      await graphHost.sendState(BOTH_CACHED);
      await graphProbe.expectLayoutEngine('cache');
    });

    await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

    await test.step('THEN every box frame lies inside the canvas', async (): Promise<void> => graphGrouping.expectBoxesInsideCanvas());

    await test.step('WHEN Fit is pressed', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

    await test.step('THEN every box frame still lies inside the canvas', async (): Promise<void> =>
      graphGrouping.expectBoxesInsideCanvas());
  });
});
