import { test } from './graph.fixture.ts';
import { BOARD_FOLDER_KEYS, cachedBoardsState } from './test/utils/graph-boards.spec.util.ts';
import { LAYING_OUT_FOLDERS_TEXT } from '../src/graph/common/graph.const.ts';

const CACHED_BOARDS = cachedBoardsState();

test.describe('FEATURE: grouped graph layout notice', () => {
  test('GIVEN a grouped layout still running, a drag the moment its notice appears moves the node', async ({
    graphCanvas,
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened with held workers', async (): Promise<void> => graphPage.open({ workers: 'held' }));

    await test.step('AND the boards graph is sent with its flat layout cached', async (): Promise<void> => {
      await graphHost.sendState(CACHED_BOARDS);
      await graphProbe.expectLayoutEngine('cache');
    });

    await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

    await test.step('THEN the notice says the folders are being laid out', async (): Promise<void> =>
      graphGrouping.expectNotice(LAYING_OUT_FOLDERS_TEXT));

    await test.step('WHEN web is dragged by 60 px right and 40 px down at once', async (): Promise<void> =>
      graphCanvas.dragNode('web', 60, 40));

    await test.step('THEN the drag posted the flat positions with web moved', async (): Promise<void> => {
      await graphCanvas.expectDragPosted();
      await graphGrouping.expectPostedGroupings(['flat']);
    });

    await test.step('WHEN the held worker is released', async (): Promise<void> => graphGrouping.releaseWorker());

    await test.step('THEN the boxes are drawn, from ELK', async (): Promise<void> => {
      await graphGrouping.expectFolderKeys(BOARD_FOLDER_KEYS);
      await graphProbe.expectLayoutEngine('elk');
    });
  });

  test('GIVEN a grouped layout still running, a drag the moment its notice hides moves the node', async ({
    graphCanvas,
    graphGrouping,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened with held workers', async (): Promise<void> => graphPage.open({ workers: 'held' }));

    await test.step('AND the boards graph is sent with its flat layout cached', async (): Promise<void> => {
      await graphHost.sendState(CACHED_BOARDS);
      await graphProbe.expectLayoutEngine('cache');
    });

    await test.step('AND Group by folder is checked', async (): Promise<void> => graphGrouping.setGrouped(true));

    await test.step('THEN the notice is shown and the canvas fits the container', async (): Promise<void> => {
      await graphGrouping.expectNotice(LAYING_OUT_FOLDERS_TEXT);
      await graphGrouping.expectCanvasFitsContainer();
    });

    await test.step('WHEN docs is dragged by 30 px right and 30 px down', async (): Promise<void> =>
      graphCanvas.dragNode('docs', 30, 30));

    await test.step('THEN the drag posted the flat positions with docs moved', async (): Promise<void> =>
      graphCanvas.expectDragPosted());

    await test.step('WHEN Group by folder is unchecked', async (): Promise<void> => graphGrouping.setGrouped(false));

    await test.step('THEN the notice is hidden', async (): Promise<void> => graphGrouping.expectNotice(null));

    await test.step('WHEN web is dragged by 60 px right and 40 px down at once', async (): Promise<void> =>
      graphCanvas.dragNode('web', 60, 40));

    await test.step('THEN the drag posted the flat positions with web moved', async (): Promise<void> =>
      graphCanvas.expectDragPosted());

    await test.step('WHEN the held worker is released', async (): Promise<void> => graphGrouping.releaseWorker());

    await test.step('THEN the grouped layout is posted for the cache, from ELK', async (): Promise<void> =>
      graphGrouping.expectPostedGroupings(['flat', 'flat', 'folders']));
  });
});
