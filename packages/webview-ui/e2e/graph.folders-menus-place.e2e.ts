import { OVERLAY_WIDTH_PX } from './common/graph.const.ts';
import { test } from './graph.fixture.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const C9 = { description: 'M4-4 C9', type: 'requirement' };

const BOARDS = placedBoardsState();

const grouped = (overrides: Partial<GraphViewState> = {}): GraphViewState => savedWith(BOARDS.hash, overrides);

test.describe('FEATURE: folder widget menu placement', () => {
  test(
    'GIVEN a 959 px editor with the details overlay open, a menu opens in the uncovered area, flipped left at the overlay',
    { annotation: C9 },
    async ({ graphFolderInspect, graphList, graphMenus, graphNarrow }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px and the grouped boards open', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphFolderInspect.open(grouped(), BOARDS);
      });

      await test.step('AND the apps "…", near the overlay edge, is pressed', async (): Promise<void> =>
        graphMenus.openFolderMenu('apps'));

      await test.step('THEN the menu lies in the canvas and ends left of the overlay', async (): Promise<void> =>
        graphMenus.expectMenuInsideUncovered());

      await test.step('WHEN Escape closes it, web is picked and its "…" is pressed', async (): Promise<void> => {
        await graphMenus.pressKey('Escape');
        await graphList.pick('web');
        await graphMenus.openPackageMenu('web');
      });

      await test.step('THEN the package menu lies in the canvas and ends left of the overlay', async (): Promise<void> =>
        graphMenus.expectMenuInsideUncovered());
    }
  );

  test(
    'GIVEN a 959 px editor with web picked and panned under the details overlay, Shift+F10 opens its menu left of the overlay',
    { annotation: C9 },
    async ({ graphFolderInspect, graphList, graphMenus, graphNarrow, graphWidgets }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px, the grouped boards open and web is picked', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphList.pick('web');
      });

      await test.step('AND web is panned 120 px under the overlay and the container is focused', async (): Promise<void> => {
        await graphWidgets.panNodeUnderOverlay('web');
        await graphWidgets.focusContainer();
      });

      await test.step('AND Shift+F10 is pressed', async (): Promise<void> => graphMenus.pressShiftF10());

      await test.step('THEN the menu lies in the canvas and ends left of the overlay', async (): Promise<void> =>
        graphMenus.expectMenuInsideUncovered());
    }
  );

  test(
    'GIVEN apps selected and panned off the canvas right edge, Shift+F10 opens its menu inside the canvas and nothing scrolls',
    { annotation: C9 },
    async ({ graphFolderInspect, graphMenus, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open and apps is tapped', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphFolderInspect.tapFolder('apps');
      });

      await test.step('AND apps is panned off the right edge and the container is focused', async (): Promise<void> => {
        await graphWidgets.panBoxOffRight('apps');
        await graphWidgets.focusContainer();
      });

      await test.step('AND Shift+F10 is pressed', async (): Promise<void> => graphMenus.pressShiftF10());

      await test.step('THEN the menu lies in the canvas, left of the details panel', async (): Promise<void> =>
        graphMenus.expectMenuInsideUncovered());

      await test.step('AND the widget layer did not scroll', async (): Promise<void> => graphWidgets.expectLayerUnscrolled());
    }
  );
});
