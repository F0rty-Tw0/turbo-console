import { test } from './graph.fixture.ts';
import { APPS_FOLDER_STUB, PACKAGES_FOLDER_STUB } from './test/stubs/graph-folder-facts.stub.ts';
import {
  DIMMED_BOX_PAINT_STUB,
  FOLDER_PAINT_ROWS_STUB,
  NORMAL_BOXES_PAINT_STUB,
  PICKING_PAINT_ROW_STUB
} from './test/stubs/graph-folder-paint.stub.ts';
import { collapsedSavedState, placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';

const C6 = { description: 'M4-4 C6', type: 'requirement' };

const BOARDS = placedBoardsState();

const DIMMED_BY_CONFIG = ['docs', 'web', '@acme/ui', '@acme/utils'];

test.describe('FEATURE: folder paint', () => {
  for (const row of FOLDER_PAINT_ROWS_STUB) {
    test(
      `GIVEN ${row.name}, each folder and folder link takes the state its packages give it`,
      { annotation: C6 },
      async ({ graphFolders, graphHost, graphPage }): Promise<void> => {
        const opened = collapsedSavedState(BOARDS.hash, row.collapsed);
        const saved = { ...opened, ...row.saved };

        await test.step('WHEN the boards open grouped', async (): Promise<void> => graphPage.open({ savedState: saved }));

        await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

        await test.step('THEN the folders and the folder links read their states', async (): Promise<void> =>
          graphFolders.expectPaint(row.paint));
      }
    );
  }

  test(
    'GIVEN config selected with both folders expanded, the apps box dims once and never fades its packages twice',
    { annotation: C6 },
    async ({ graphFolderPackages, graphFolders, graphHost, graphPage }): Promise<void> => {
      const opened = collapsedSavedState(BOARDS.hash, []);
      const saved = { ...opened, selected: '@acme/config' };

      await test.step('WHEN the boards open grouped', async (): Promise<void> => graphPage.open({ savedState: saved }));

      await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

      await test.step('THEN the apps box reads dimmed and the packages box normal', async (): Promise<void> =>
        graphFolders.expectPaint(DIMMED_BOX_PAINT_STUB));

      await test.step('AND the four other packages read dimmed', async (): Promise<void> =>
        graphFolderPackages.expectDimmed(DIMMED_BY_CONFIG));

      await test.step('AND every package draws at 0.25 when dimmed and at 1 otherwise', async (): Promise<void> =>
        graphFolderPackages.expectOpacityMatchesState());
    }
  );

  test(
    'GIVEN config selected, pressing Start trace paints the folders like the selection did',
    { annotation: C6 },
    async ({ graphDetails, graphFolders, graphHost, graphPage }): Promise<void> => {
      const opened = collapsedSavedState(BOARDS.hash, PICKING_PAINT_ROW_STUB.collapsed);
      const saved = { ...opened, ...PICKING_PAINT_ROW_STUB.saved };

      await test.step('WHEN the boards open grouped with apps collapsed', async (): Promise<void> =>
        graphPage.open({ savedState: saved }));

      await test.step('AND the boards state is sent and a trace is started', async (): Promise<void> => {
        await graphHost.sendState(BOARDS);
        await graphDetails.startTrace();
      });

      await test.step('THEN the folders and the folder links read their states', async (): Promise<void> =>
        graphFolders.expectPaint(PICKING_PAINT_ROW_STUB.paint));
    }
  );

  test('GIVEN nothing inspected, the folders list the same packages in the same states as the boards graph', async ({
    graphFolders,
    graphHost,
    graphPage
  }): Promise<void> => {
    await test.step('WHEN the boards open grouped', async (): Promise<void> =>
      graphPage.open({ savedState: collapsedSavedState(BOARDS.hash, []) }));

    await test.step('AND the boards state is sent', async (): Promise<void> => graphHost.sendState(BOARDS));

    await test.step('THEN two expanded folders list their packages', async (): Promise<void> =>
      graphFolders.expectFolders([APPS_FOLDER_STUB, PACKAGES_FOLDER_STUB]));

    await test.step('AND both read normal', async (): Promise<void> => graphFolders.expectPaint(NORMAL_BOXES_PAINT_STUB));
  });
});
