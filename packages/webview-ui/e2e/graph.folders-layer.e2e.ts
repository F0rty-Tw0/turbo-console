import { OVERLAY_WIDTH_PX } from './common/graph.const.ts';
import type { GraphOptions } from './common/graph.type.ts';
import { test } from './graph.fixture.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const C9 = { description: 'M4-4 C9', type: 'requirement' };

const BOARDS = placedBoardsState();

const HELD: GraphOptions = { workers: 'held' };

const grouped = (overrides: Partial<GraphViewState> = {}): GraphViewState => savedWith(BOARDS.hash, overrides);

test.describe('FEATURE: folder widget layer', () => {
  test(
    'GIVEN the boards grouped, the flow overlay and the layer follow the container and each box has a header row',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened', async (): Promise<void> => graphFolderInspect.open(grouped(), BOARDS));

      await test.step("THEN the flow overlay then the layer follow the container, the layer over the container's rect", async (): Promise<void> =>
        graphWidgets.expectLayerAfterContainer());

      await test.step('AND apps has a header row with its title and 2 packages', async (): Promise<void> =>
        graphWidgets.expectBoxRow('apps', '2 packages'));

      await test.step('AND packages has a header row with its title and 3 packages', async (): Promise<void> =>
        graphWidgets.expectBoxRow('packages', '3 packages'));
    }
  );

  test(
    'GIVEN the boards grouped, each chevron and "…" sits 8 px inside its box\'s header band',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened', async (): Promise<void> => graphFolderInspect.open(grouped(), BOARDS));

      for (const folder of ['apps', 'packages']) {
        await test.step(`THEN the ${folder} chevron is 8 px from the left and 4 px below the top`, async (): Promise<void> =>
          graphWidgets.expectChevronOnBox(folder));

        await test.step(`AND the ${folder} "…" is 8 px from the right`, async (): Promise<void> =>
          graphWidgets.expectEllipsisOnBox(folder));
      }
    }
  );

  test(
    'GIVEN the boards grouped, a package picked in the list gets one "…" until grouping is turned off',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphList, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened', async (): Promise<void> => graphFolderInspect.open(grouped(), BOARDS));

      await test.step('THEN no package has a "…"', async (): Promise<void> => graphWidgets.expectNoPackageButton());

      await test.step('WHEN web is picked in the list', async (): Promise<void> => graphList.pick('web'));

      await test.step('THEN one "…" sits centred on web\'s top-right corner', async (): Promise<void> =>
        graphWidgets.expectPackageButtonOn('web'));

      await test.step('WHEN grouping is turned off', async (): Promise<void> => graphGrouping.setGrouped(false));

      await test.step('THEN no header row is left', async (): Promise<void> => graphWidgets.expectNoRows());

      await test.step('AND no package "…" is left', async (): Promise<void> => graphWidgets.expectNoPackageButton());
    }
  );

  test(
    'GIVEN the boards grouped, the apps chevron collapses apps into a node with its buttons in the corners',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened', async (): Promise<void> => graphFolderInspect.open(grouped(), BOARDS));

      await test.step('AND the apps chevron is pressed', async (): Promise<void> => graphWidgets.chevronOf('apps', true).click());

      await test.step('THEN apps is collapsed', async (): Promise<void> => graphGrouping.expectFolderCollapsed('apps', true));

      await test.step('AND its row is a collapsed row with Expand and "…" 8 px inside the node\'s top corners', async (): Promise<void> =>
        graphWidgets.expectCollapsedRow('apps'));

      await test.step('AND focus moves from the pressed chevron to the Expand chevron that replaced it', async (): Promise<void> =>
        graphWidgets.expectChevronFocused('apps', false));
    }
  );

  test(
    'GIVEN a switch to flat still laying out, the apps chevron does nothing',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphWidgets }): Promise<void> => {
      await test.step('WHEN the boards open grouped with the flat layout held and Group by folder is unchecked', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS, HELD);
        await graphGrouping.setGrouped(false);
      });

      await test.step('AND the apps chevron, still drawn, is pressed', async (): Promise<void> =>
        graphWidgets.chevronOf('apps', true).click());

      await test.step('THEN apps stays expanded', async (): Promise<void> => graphGrouping.expectFolderCollapsed('apps', false));
    }
  );

  test(
    'GIVEN a narrow editor and the controls closed, a box\'s "…" under the open overlay is hidden while its chevron shows',
    { annotation: C9 },
    async ({ graphFolderInspect, graphNarrow, graphWidgets }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px and the grouped boards open with the controls closed', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphFolderInspect.open(grouped({ controlsOpen: false }), BOARDS);
      });

      await test.step('AND the apps box is panned so its right end sits under the overlay', async (): Promise<void> =>
        graphWidgets.panBoxUnderOverlay('apps'));

      await test.step('THEN its "…" is hidden and its chevron shows', async (): Promise<void> =>
        graphWidgets.expectEllipsisUnderOverlay('apps'));
    }
  );

  test(
    'GIVEN a narrow editor, tapping a package in the overlay margin pans its "…" clear of the overlay',
    { annotation: C9 },
    async ({ graphCanvas, graphFolderInspect, graphNarrow, graphWidgets }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px and the grouped boards open', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphFolderInspect.open(grouped(), BOARDS);
      });

      await test.step('AND web is panned into the keep-clear margin of the overlay', async (): Promise<void> =>
        graphWidgets.panIntoOverlayMargin('web'));

      await test.step('AND web is tapped', async (): Promise<void> => graphCanvas.tapNode('web'));

      await test.step('THEN web\'s "…" ends left of the overlay with the margin to spare', async (): Promise<void> =>
        graphWidgets.expectPackageButtonClear('web'));
    }
  );
});
