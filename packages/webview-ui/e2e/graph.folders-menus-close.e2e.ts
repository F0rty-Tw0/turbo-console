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
});
