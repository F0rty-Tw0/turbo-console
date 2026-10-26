import { test } from './graph.fixture.ts';
import { LONG_FOLDER, collapsedSavedState, longTitleState, placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { Position } from '../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const C9 = { description: 'M4-4 C9', type: 'requirement' };

const BOARDS = placedBoardsState();

const LONG = longTitleState();

/** Puts the long-title node, placed at the origin, in the canvas middle at any zoom. */
const LONG_PAN: Position = { x: 400, y: 300 };

/** Zoom 120/180: the 180 px collapsed node is drawn at the 120 px minimum, its row at scale 0.667. */
const NODE_MIN_ZOOM = 0.667;

/** The node's body is drawn 117 px wide, under the minimum, but its 2 px selected border draws its bounds 120.3 px wide. */
const SELECTED_BORDER_ZOOM = 0.654;

const grouped = (overrides: Partial<GraphViewState> = {}): GraphViewState => savedWith(BOARDS.hash, overrides);

const longCollapsedAt = (zoom: number): GraphViewState => {
  const collapsed = collapsedSavedState(LONG.hash, [LONG_FOLDER]);
  const state: GraphViewState = { ...collapsed, zoom, pan: LONG_PAN };

  return state;
};

test.describe('FEATURE: folder header rows in the box band', () => {
  test(
    'GIVEN the boards grouped at zoom 0.52, the apps row is scaled into its band and a click just inside docs selects docs',
    { annotation: C9 },
    async ({ graphFolderInspect, graphGrouping, graphProbe, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open at zoom 0.52', async (): Promise<void> =>
        graphFolderInspect.open(grouped({ zoom: 0.52 }), BOARDS));

      await test.step('THEN the apps chevron and "…" show inside its band as drawn', async (): Promise<void> =>
        graphWidgets.expectRowInBand('apps'));

      await test.step('AND they sit on the box as scaled', async (): Promise<void> => graphWidgets.expectRowsFollowBoxes(['apps']));

      await test.step('WHEN docs is clicked 2 px inside its top-left corner', async (): Promise<void> =>
        graphWidgets.tapNodeCorner('docs'));

      await test.step('THEN docs is selected and apps stays expanded', async (): Promise<void> => {
        await graphProbe.expectSelected('docs');
        await graphGrouping.expectFolderCollapsed('apps', false);
      });
    }
  );

  test(
    'GIVEN the boards grouped at zoom 0.49, under half-size buttons, the apps box has no header row',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open at zoom 0.49', async (): Promise<void> =>
        graphFolderInspect.open(grouped({ zoom: 0.49 }), BOARDS));

      await test.step('THEN apps shows no header button', async (): Promise<void> => graphWidgets.expectHeaderHidden('apps'));
    }
  );

  test(
    'GIVEN the boards fitted and apps selected, its chevron clears the selected border, centred in the band',
    { annotation: C9 },
    async ({ graphCanvas, graphFolderInspect, graphPage, graphWidgets }): Promise<void> => {
      await test.step('WHEN the grouped boards open, Fit frames them and apps is tapped', async (): Promise<void> => {
        await graphFolderInspect.open(grouped(), BOARDS);
        await graphPage.pressButton(FIT_LABEL);
        await graphCanvas.expectAllNodesInView();
        await graphFolderInspect.tapFolder('apps');
      });

      await test.step('THEN the apps chevron is at least 2 px times the zoom below the box top', async (): Promise<void> =>
        graphWidgets.expectChevronBelowTop('apps', 2));

      await test.step('AND the row is centred in the band', async (): Promise<void> => graphWidgets.expectRowFollowsBox('apps'));
    }
  );

  test(
    'GIVEN a collapsed node with a long title, its buttons show on it clear of the widest title at zoom 0.667 and at zoom 2',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the page opens with the node collapsed at zoom 0.667, drawn 120 px wide', async (): Promise<void> =>
        graphFolderInspect.open(longCollapsedAt(NODE_MIN_ZOOM), LONG));

      await test.step('THEN its chevron and "…" sit on the node at that scale, clear of the widest title', async (): Promise<void> => {
        await graphWidgets.expectCollapsedRow(LONG_FOLDER);
        await graphWidgets.expectCollapsedClearOfLabel(LONG_FOLDER);
      });

      await test.step('WHEN the page opens with the node collapsed at zoom 2', async (): Promise<void> =>
        graphFolderInspect.open(longCollapsedAt(2), LONG));

      await test.step('THEN its chevron and "…" sit on the node full size, clear of the widest title', async (): Promise<void> => {
        await graphWidgets.expectCollapsedRow(LONG_FOLDER);
        await graphWidgets.expectCollapsedClearOfLabel(LONG_FOLDER);
      });
    }
  );

  test(
    'GIVEN a collapsed node drawn under 120 px wide at zoom 0.654, selecting it and thickening its border shows no buttons',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the page opens with the node collapsed at zoom 0.654', async (): Promise<void> =>
        graphFolderInspect.open(longCollapsedAt(SELECTED_BORDER_ZOOM), LONG));

      await test.step('THEN it shows no header button', async (): Promise<void> => graphWidgets.expectHeaderHidden(LONG_FOLDER));

      await test.step('WHEN the node is tapped', async (): Promise<void> => graphFolderInspect.tapFolder(LONG_FOLDER));

      await test.step('THEN it is selected and still shows no header button', async (): Promise<void> => {
        await graphFolderInspect.expectFolderState(LONG_FOLDER, 'selected');
        await graphWidgets.expectHeaderStaysHidden(LONG_FOLDER);
      });
    }
  );
});
