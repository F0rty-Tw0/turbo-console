import { test } from './graph.fixture.ts';
import { BOARD_FOLDER_KEYS, PACKAGES_FOLDER_MEMBERS, bothCachedBoardsState } from './test/utils/graph-boards.spec.util.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const BOTH_CACHED = bothCachedBoardsState();

const BOARDS = placedBoardsState();

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

  test('GIVEN the grouped boards framed by Fit, a container resize in the middle of a box drag leaves the packages where the drag put them, and fits at the drop', async ({
    graphCamera,
    graphCanvas,
    graphFolderPackages,
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped', async (): Promise<void> =>
      graphPage.open({ savedState: groupedSavedState(BOARDS.hash) }));

    await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

    await test.step('AND Fit frames the graph, since the saved camera looks at an empty corner', async (): Promise<void> => {
      await graphPage.pressButton(FIT_LABEL);
      await graphCanvas.expectAllNodesInView();
      await graphCamera.rememberCamera();
    });

    await test.step('AND the packages box is dragged by 60 and 40 pixels, the container 1 px shorter halfway', async (): Promise<void> =>
      graphFolderPackages.dragBoxShrinkingMidway('packages', 60, 40));

    await test.step('THEN the three packages moved once, by the drag alone', async (): Promise<void> =>
      graphFolderPackages.expectDragMoved(PACKAGES_FOLDER_MEMBERS));

    await test.step('AND the apps packages stayed', async (): Promise<void> => graphFolderPackages.expectDragStill(['docs', 'web']));

    await test.step('AND the fit held during the drag ran at the drop, framing every package', async (): Promise<void> => {
      await graphCamera.expectCameraMoved();
      await graphCanvas.expectAllNodesInView();
    });
  });
});
