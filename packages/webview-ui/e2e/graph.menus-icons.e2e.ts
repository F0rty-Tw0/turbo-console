import { test } from './graph.fixture.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphIconId } from '../src/graph/common/graph-icon.type.ts';

const BOARDS = placedBoardsState();

const D6 = { description: 'M5-1 U3d1 D6', type: 'requirement' };

const PACKAGE_ITEMS: [string, GraphIconId][] = [
  ['View Package Details', 'file-text'],
  ['Focus', 'target'],
  ['Start trace', 'git-commit'],
  ['Exclude', 'eye-closed']
];

test.describe('FEATURE: widget menu icons', () => {
  test(
    'GIVEN a picked package, its "…" menu draws one icon per item and offers no checkbox item',
    { annotation: D6 },
    async ({ graphFolderInspect, graphList, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open, web is picked and its "…" is pressed', async (): Promise<void> => {
        await graphFolderInspect.open(savedWith(BOARDS.hash, {}), BOARDS);
        await graphList.pick('web');
        await graphMenus.openPackageMenu('web');
      });

      await test.step('THEN it lists View Package Details, Focus, Start trace and Exclude', async (): Promise<void> =>
        graphMenus.expectItems(PACKAGE_ITEMS.map(([name]): string => name)));

      for (const [name, id] of PACKAGE_ITEMS) {
        await test.step(`AND ${name} draws the ${id} icon`, async (): Promise<void> => graphMenus.expectItemIcon(name, id));
      }

      await test.step('AND no item is a checkbox', async (): Promise<void> => graphMenus.expectNoCheckboxItems());
    }
  );
});
