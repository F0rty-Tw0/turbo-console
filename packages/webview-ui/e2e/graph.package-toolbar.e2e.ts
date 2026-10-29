import { IS_SHIFT_F10_SILENT, SHIFT_F10_SILENT_REASON } from './common/graph.const.ts';
import { test } from './graph-task.fixture.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';

const D5 = { description: 'U4 D5', type: 'requirement' };

const BOARDS = placedBoardsState();

const WEB_ITEMS = ['View Package Details', 'Focus', 'Start trace', 'Exclude'];

test.describe('FEATURE: package node toolbar', () => {
  test(
    'GIVEN the boards flat with web picked, Shift+F10 on the graph opens the package menu',
    { annotation: D5 },
    async ({ graphFolderInspect, graphList, graphMenus, graphNodeToolbar, graphWidgets }): Promise<void> => {
      // eslint-disable-next-line playwright/no-skipped-test -- macOS Chromium never fires the event this test watches
      test.skip(IS_SHIFT_F10_SILENT, SHIFT_F10_SILENT_REASON);

      await test.step('WHEN the flat boards open and web is picked', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, { grouped: false }), BOARDS);
        await graphList.pick('web');
        await graphNodeToolbar.expectNodeInView('web');
      });

      await test.step('AND the container is focused and Shift+F10 is pressed', async (): Promise<void> => {
        await graphWidgets.focusContainer();
        await graphMenus.pressShiftF10();
      });

      await test.step('THEN the web menu lists its items', async (): Promise<void> => graphMenus.expectItems(WEB_ITEMS));
    }
  );
});
