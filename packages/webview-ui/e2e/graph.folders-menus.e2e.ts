import type { GraphOptions } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const C9 = { description: 'M4-4 C9', type: 'requirement' };

const BOARDS = placedBoardsState();

const HELD: GraphOptions = { workers: 'held' };

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
});
