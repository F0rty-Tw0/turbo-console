import { test } from './graph.fixture.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const C9 = { description: 'M4-4 C9', type: 'requirement' };

const BOARDS = placedBoardsState();

const grouped = (overrides: Partial<GraphViewState> = {}): GraphViewState => savedWith(BOARDS.hash, overrides);

test.describe('FEATURE: folder widget menu closing', () => {
  test(
    'GIVEN the apps menu open, a second press on its own "…" closes it onto the "…"',
    { annotation: C9 },
    async ({ graphFolderInspect, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the apps menu opens', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphMenus.openFolderMenu('apps');
      });

      await test.step('AND the apps "…" is pressed again', async (): Promise<void> => graphMenus.pressFolderEllipsis('apps'));

      await test.step('THEN the menu is gone and focus is on the apps "…"', async (): Promise<void> =>
        graphMenus.expectFocusOnEllipsis('apps'));
    }
  );

  test(
    'GIVEN the apps menu open, Tab moves focus out of it, which closes it and leaves focus where Tab put it',
    { annotation: C9 },
    async ({ graphFolderInspect, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the apps menu opens', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphMenus.openFolderMenu('apps');
      });

      await test.step('AND Tab is pressed', async (): Promise<void> => graphMenus.pressKey('Tab'));

      await test.step('THEN the menu is gone and focus stayed on the next control, not the apps "…"', async (): Promise<void> =>
        graphMenus.expectMenuLeftFor('apps'));
    }
  );

  test(
    'GIVEN the apps menu open, a wheel zoom closes it and gives focus back to the apps "…"',
    { annotation: C9 },
    async ({ graphFolderInspect, graphMenus, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the apps menu opens', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphMenus.openFolderMenu('apps');
      });

      await test.step('AND the canvas is zoomed out a notch', async (): Promise<void> => graphWidgets.zoomBy(100));

      await test.step('THEN the menu is gone and focus is on the apps "…"', async (): Promise<void> =>
        graphMenus.expectFocusOnEllipsis('apps'));
    }
  );

  test(
    'GIVEN the apps menu open at zoom 0.6, a zoom to 0.4 in one step hides its "…", closes the menu and gives focus to the graph',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphMenus, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open at zoom 0.6 and the apps menu opens', async (): Promise<void> => {
        await graphFolderInspect.open(grouped({ zoom: 0.6 }), BOARDS);
        await graphMenus.openFolderMenu('apps');
      });

      await test.step("AND one wheel event zooms the canvas to 0.4, under the header rows' 0.5 floor", async (): Promise<void> => {
        const spot = await graphGrouping.freeSpot();

        await graphMenus.zoomOutInOneStep(spot);
      });

      await test.step('THEN the apps "…" is hidden', async (): Promise<void> => graphWidgets.expectHeaderHidden('apps'));

      await test.step('AND the menu is gone and focus is on the graph container', async (): Promise<void> => {
        await graphMenus.expectNoMenu();
        await graphMenus.expectFocusOnContainer();
      });
    }
  );

  test(
    'GIVEN the apps menu open, a pan that keeps the zoom closes it',
    { annotation: C9 },
    async ({ graphCamera, graphFolderInspect, graphGrouping, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the apps menu opens', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphMenus.openFolderMenu('apps');
        await graphCamera.rememberCamera();
      });

      await test.step('AND the canvas is panned 40 px right by mouse events alone', async (): Promise<void> => {
        const spot = await graphGrouping.freeSpot();

        await graphMenus.panWithoutPress(spot, 40);
      });

      await test.step('THEN the camera moved with the zoom unchanged', async (): Promise<void> => {
        await graphCamera.expectCameraMoved();
        await graphCamera.expectZoomUnchanged();
      });

      await test.step('AND the menu is gone', async (): Promise<void> => graphMenus.expectNoMenu());
    }
  );

  test(
    'GIVEN focus in the search box, Shift+F10 leaves the native context menu alone',
    { annotation: C9 },
    async ({ graphFolderInspect, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open and the search box is focused', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphMenus.recordContextMenus();
        await graphMenus.focusSearch();
      });

      await test.step('AND Shift+F10 is pressed', async (): Promise<void> => graphMenus.pressKey('Shift+F10'));

      await test.step('THEN no contextmenu was prevented and no page menu opened', async (): Promise<void> => {
        await graphMenus.expectNativeContextMenuAllowed();
        await graphMenus.expectNoMenu();
      });
    }
  );

  test(
    'GIVEN web picked and focus on a details panel button, Shift+F10 leaves the native context menu alone',
    { annotation: C9 },
    async ({ graphDetails, graphFolderInspect, graphList, graphMenus }): Promise<void> => {
      await test.step('WHEN the grouped boards open, web is picked and Start trace is focused', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphList.pick('web');
        await graphMenus.recordContextMenus();
        await graphDetails.focusButton('Start trace');
      });

      await test.step('AND Shift+F10 is pressed', async (): Promise<void> => graphMenus.pressKey('Shift+F10'));

      await test.step('THEN no contextmenu was prevented and no page menu opened', async (): Promise<void> => {
        await graphMenus.expectNativeContextMenuAllowed();
        await graphMenus.expectNoMenu();
      });
    }
  );
});
