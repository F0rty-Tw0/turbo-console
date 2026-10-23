import { DOCKED_WIDTH_PX, OVERLAY_WIDTH_PX, WIDGET_MIN_BOX_PX } from './common/graph.const.ts';
import { test } from './graph.fixture.ts';
import { LONG_FOLDER, longTitleState, placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { packageOf } from './test/utils/graph-package.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { GraphReady } from '../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const C9 = { description: 'M4-4 C9', type: 'requirement' };

const BOARDS = placedBoardsState();

const FOLDERS = ['apps', 'packages'];

const ADMIN_PACKAGES = [...BOARDS.packages, packageOf('admin', 'apps/admin')];

/** The boards under a new hash with `admin` added to apps, laid out afresh. */
const WITH_ADMIN: GraphReady = { ...BOARDS, hash: 'b0a2d501', packages: ADMIN_PACKAGES, folderPositions: null };

const grouped = (overrides: Partial<GraphViewState> = {}): GraphViewState => savedWith(BOARDS.hash, overrides);

test.describe('FEATURE: folder widget placement', () => {
  test(
    'GIVEN the boards grouped, every header follows its box through a pan and a zoom in and out',
    { annotation: C9 },
    async ({ graphCanvas, graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened', async (): Promise<void> => graphFolderInspect.open(grouped(), BOARDS));

      await test.step('AND the canvas is panned 40 px down', async (): Promise<void> => graphCanvas.panBy(0, 40));

      await test.step('THEN the apps and packages chevrons and "…" are on its box', async (): Promise<void> =>
        graphWidgets.expectRowsFollowBoxes(FOLDERS));

      await test.step('WHEN the canvas is zoomed in by 4 notches', async (): Promise<void> => graphWidgets.zoomBy(-400));

      await test.step('THEN the apps and packages chevrons and "…" are on its larger box', async (): Promise<void> =>
        graphWidgets.expectRowsFollowBoxes(FOLDERS));

      await test.step('WHEN the canvas is zoomed back out by 4 notches', async (): Promise<void> => graphWidgets.zoomBy(400));

      await test.step('THEN the apps and packages chevrons and "…" are on its box again', async (): Promise<void> =>
        graphWidgets.expectRowsFollowBoxes(FOLDERS));
    }
  );

  test(
    'GIVEN a box under 120 px wide, its header buttons hide, the list still collapses it, and they return when it widens',
    { annotation: C9 },
    async ({ graphFolderInspect, graphFolders, graphGrouping, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened', async (): Promise<void> => graphFolderInspect.open(grouped(), BOARDS));

      await test.step('AND the canvas is zoomed out until apps is under 120 px wide', async (): Promise<void> =>
        graphWidgets.zoomBoxUnder('apps', WIDGET_MIN_BOX_PX));

      await test.step('THEN apps has no shown header button', async (): Promise<void> => graphWidgets.expectHeaderHidden('apps'));

      await test.step('AND packages, still wide enough, keeps its buttons', async (): Promise<void> =>
        graphWidgets.expectRowFollowsBox('packages'));

      await test.step('WHEN the list header collapses apps', async (): Promise<void> => graphFolders.toggleInList('apps', true));

      await test.step('THEN apps is collapsed', async (): Promise<void> => graphGrouping.expectFolderCollapsed('apps', true));

      await test.step('WHEN the list header expands apps and the canvas is zoomed in until apps is 120 px wide', async (): Promise<void> => {
        await graphFolders.toggleInList('apps', false);
        await graphWidgets.zoomBoxOver('apps', WIDGET_MIN_BOX_PX);
      });

      await test.step('THEN the apps chevron and "…" show again inside its box, within a pixel', async (): Promise<void> =>
        graphWidgets.expectRowFollowsBox('apps'));
    }
  );

  test(
    'GIVEN a folder with a very long title, the title ends in an ellipsis inside the header band',
    { annotation: C9 },
    async ({ graphCanvas, graphFolderInspect, graphPage, graphWidgets }): Promise<void> => {
      const state = longTitleState();

      await test.step('WHEN the page opens grouped with one folder of a very long name', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(state.hash, {}), state));

      await test.step('AND Fit frames the graph, which widens the lone box past 120 px', async (): Promise<void> => {
        await graphPage.pressButton(FIT_LABEL);
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('THEN the title is cut with an ellipsis, keeps its full text and sits in the top band of the box', async (): Promise<void> =>
        graphWidgets.expectTitleEllipsis(LONG_FOLDER));
    }
  );

  test(
    'GIVEN a 959 px editor with web picked, no widget shows under the details overlay',
    { annotation: C9 },
    async ({ graphFolderInspect, graphList, graphNarrow, graphWidgets }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px and the grouped boards open', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphFolderInspect.open(grouped(), BOARDS);
      });

      await test.step('AND web is picked in the list, with its details open', async (): Promise<void> => graphList.pick('web'));

      await test.step('THEN no shown widget meets the details aside', async (): Promise<void> =>
        graphWidgets.expectWidgetsHiddenUnderOverlay());

      await test.step('AND the packages "…", which the aside covers, is hidden while its chevron shows', async (): Promise<void> =>
        graphWidgets.expectEllipsisUnderOverlay('packages'));
    }
  );

  test(
    'GIVEN a 960 px editor with web picked and the graph fitted, the details dock and the apps row shows both buttons',
    { annotation: C9 },
    async ({ graphCanvas, graphFolderInspect, graphList, graphNarrow, graphPage, graphWidgets }): Promise<void> => {
      await test.step('WHEN the editor is 960 px wide and the grouped boards open', async (): Promise<void> => {
        await graphNarrow.setWidth(DOCKED_WIDTH_PX);
        await graphFolderInspect.open(grouped(), BOARDS);
      });

      await test.step('AND web is picked in the list, with its details open', async (): Promise<void> => graphList.pick('web'));

      await test.step('AND Fit frames the graph in the narrower docked canvas', async (): Promise<void> => {
        await graphPage.pressButton(FIT_LABEL);
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('THEN the apps chevron and "…" both show on its box', async (): Promise<void> =>
        graphWidgets.expectRowFollowsBox('apps'));
    }
  );

  test(
    'GIVEN the boards grouped, unticking docs shrinks the apps box and its header follows',
    { annotation: C9 },
    async ({ graphFolderInspect, graphList, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened and the apps width is read', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphWidgets.rememberBoxWidth('apps');
      });

      await test.step('AND docs is unticked in the list', async (): Promise<void> => graphList.toggleRow('docs'));

      await test.step('THEN the apps box is narrower', async (): Promise<void> => graphWidgets.expectBoxNarrower('apps'));

      await test.step('AND the apps chevron and "…" are on the narrower box', async (): Promise<void> =>
        graphWidgets.expectRowFollowsBox('apps'));
    }
  );

  test(
    'GIVEN the controls closed, opening the controls panel moves the container and every header follows',
    { annotation: C9 },
    async ({ graphControls, graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open with the controls closed', async (): Promise<void> =>
        graphFolderInspect.open(grouped({ controlsOpen: false }), BOARDS));

      await test.step('AND the controls panel is opened', async (): Promise<void> => graphControls.toggle());

      await test.step('THEN the apps and packages chevrons and "…" are on its box', async (): Promise<void> =>
        graphWidgets.expectRowsFollowBoxes(FOLDERS));
    }
  );

  test(
    'GIVEN a 959 px editor with the details closed, opening the details overlay hides the "…" it covers',
    { annotation: C9 },
    async ({ graphCanvas, graphDetails, graphFolderInspect, graphNarrow, graphWidgets }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px and the boards open with the controls and details closed', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphFolderInspect.open(grouped({ controlsOpen: false, detailsOpen: false }), BOARDS);
      });

      await test.step('AND the canvas is panned right so the packages "…" lies where the overlay will be', async (): Promise<void> =>
        graphCanvas.panBy(120, 0));

      await test.step('THEN the packages "…" shows', async (): Promise<void> => graphWidgets.expectEllipsisShown('packages'));

      await test.step('WHEN the details panel is opened', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the packages "…" is hidden under the overlay while its chevron shows', async (): Promise<void> =>
        graphWidgets.expectEllipsisUnderOverlay('packages'));
    }
  );

  test(
    'GIVEN the boards grouped, Tab reaches the first chevron, Enter collapses it, and Tab then Enter opens the "…" menu',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphMenus, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards page is opened and the graph container has focus', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphWidgets.focusContainer();
      });

      await test.step('AND Tab is pressed', async (): Promise<void> => graphMenus.pressKey('Tab'));

      await test.step('THEN the apps chevron has focus', async (): Promise<void> => graphWidgets.expectChevronFocused('apps', true));

      await test.step('WHEN Enter is pressed', async (): Promise<void> => graphMenus.pressKey('Enter'));

      await test.step('THEN apps is collapsed and its Expand chevron has focus', async (): Promise<void> => {
        await graphGrouping.expectFolderCollapsed('apps', true);
        await graphWidgets.expectChevronFocused('apps', false);
      });

      await test.step('WHEN Tab is pressed', async (): Promise<void> => graphMenus.pressKey('Tab'));

      await test.step('THEN the apps "…" has focus', async (): Promise<void> => graphWidgets.expectEllipsisFocused('apps'));

      await test.step('WHEN Enter is pressed', async (): Promise<void> => graphMenus.pressKey('Enter'));

      await test.step('THEN the apps menu opens', async (): Promise<void> =>
        graphMenus.expectItems(['Expand', 'Focus folder', 'Show folder']));
    }
  );

  test(
    'GIVEN the boards grouped with nothing selected there is no package "…", and a flat page has neither a header row nor one',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphList, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open with nothing selected', async (): Promise<void> =>
        graphFolderInspect.open(grouped(), BOARDS));

      await test.step('THEN apps has a row and no package has a "…"', async (): Promise<void> => {
        await graphWidgets.expectBoxRow('apps', '2 packages');
        await graphWidgets.expectNoPackageButton();
      });

      await test.step('WHEN web is picked', async (): Promise<void> => graphList.pick('web'));

      await test.step('THEN web has the one package "…"', async (): Promise<void> => graphWidgets.expectPackageButtonOn('web'));

      await test.step('WHEN Group by folder is unchecked', async (): Promise<void> => graphGrouping.setGrouped(false));

      await test.step('THEN no header row and no package "…" is left', async (): Promise<void> => {
        await graphWidgets.expectNoRows();
        await graphWidgets.expectNoPackageButton();
      });
    }
  );

  test(
    'GIVEN the packages chevron focused, apps coming back before it keeps the focus on that chevron',
    { annotation: C9 },
    async ({ graphFolderInspect, graphList, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open and both apps packages are unticked, so apps has no row', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphList.uncheckWithoutFocus('docs');
        await graphList.uncheckWithoutFocus('web');
        await graphWidgets.expectNoRow('apps');
      });

      await test.step('AND the packages chevron is focused', async (): Promise<void> => {
        await graphWidgets.chevronOf('packages', true).focus();
        await graphWidgets.expectChevronFocused('packages', true);
      });

      await test.step('AND web is ticked again without moving focus, so apps gets its row back, first in order', async (): Promise<void> => {
        await graphList.uncheckWithoutFocus('web');
        await graphWidgets.expectBoxRow('apps', '2 packages');
      });

      await test.step('THEN the focus is still on the packages chevron', async (): Promise<void> =>
        graphWidgets.expectChevronFocused('packages', true));
    }
  );

  test(
    'GIVEN the boards grouped, a new graph that adds a package to apps updates the apps row count',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphHost, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open with apps reading 2 packages', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphWidgets.expectBoxRow('apps', '2 packages');
      });

      await test.step('AND a new graph adds admin to apps', async (): Promise<void> => {
        await graphHost.sendState(WITH_ADMIN);
        await graphGrouping.expectFolderPackages('apps', ['admin', 'docs', 'web']);
      });

      await test.step('THEN the apps row reads 3 packages', async (): Promise<void> =>
        graphWidgets.expectBoxRow('apps', '3 packages'));
    }
  );
});
