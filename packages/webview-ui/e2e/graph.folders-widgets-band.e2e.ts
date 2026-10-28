import { test } from './graph.fixture.ts';
import {
  LONG_FOLDER,
  collapsedSavedState,
  deepFolderState,
  longTitleState,
  placedBoardsState
} from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import type { Position } from '../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';
import { FIT_LABEL } from '../src/graph/common/graph.const.ts';

const C9 = { description: 'M4-4 C9', type: 'requirement' };

const BOARDS = placedBoardsState();

const APPS_COLLAPSED = collapsedSavedState(BOARDS.hash, ['apps']);

const LONG = longTitleState();

/** Puts the long-title node, placed at the origin, in the canvas middle at any zoom. */
const LONG_PAN: Position = { x: 400, y: 300 };

/** Zoom 120/220: the 220 px collapsed node is drawn at the 120 px minimum, its row at scale 0.546. */
const NODE_MIN_ZOOM = 0.546;

/** Body 118.1 px, plain-border bounds 119.8 px, under the minimum; the 2 px selected border draws 120.3 px; only zooms 0.5357–0.5381 straddle 120 px. */
const SELECTED_BORDER_ZOOM = 0.537;

/** Zoom 0.5: the 220 px collapsed node is drawn 110 px wide, under the 120 px minimum, so it has no row. */
const ROW_LESS_ZOOM = 0.5;

const DEEP = deepFolderState();

/** Keeps the `deep` box's top band and both ends on the canvas at both zooms below. */
const DEEP_PAN: Position = { x: 400, y: 150 };

/**
 * The `deep` box is 113.5 px wide at zoom 1 and its row is box width · zoom − 16 px at zoom 0.875 and up (`widget-geometry.util.ts`); the
 * row bands below catch drift in it. Zoom (106 + 16) / 113.5 gives a 106 px row, near the 104 px floor of a 120 px box.
 */
const DEEP_NARROW_ZOOM = 1.075;

/** Zoom (145 + 16) / 113.5: a 145 px row, over the 140 px glyph line. */
const DEEP_WIDE_ZOOM = 1.4185;

/**
 * The narrow row lies in 104 to 110 px. The title's 3ch floor (19.5 px in the e2e font) still fits a 2-digit row down to
 * 104.5 px, so dropping the floor under 140 px only matters for a 3-digit count, which no row here draws.
 */
const NARROW_ROW_MIN_PX = 104;

const NARROW_ROW_MAX_PX = 110;

const WIDE_ROW_MIN_PX = 140;

const WIDE_ROW_MAX_PX = 150;

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
    'GIVEN a collapsed node with a long title, its buttons show on it clear of its title and badge at zoom 0.546 and at zoom 2',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the page opens with the node collapsed at zoom 0.546, drawn 120 px wide', async (): Promise<void> =>
        graphFolderInspect.open(longCollapsedAt(NODE_MIN_ZOOM), LONG));

      await test.step('THEN its chevron and "…" sit on the node at that scale, clear of the title and badge', async (): Promise<void> => {
        await graphWidgets.expectCollapsedRow(LONG_FOLDER);
        await graphWidgets.expectButtonsClearOfHeader(LONG_FOLDER);
      });

      await test.step('WHEN the page opens with the node collapsed at zoom 2', async (): Promise<void> =>
        graphFolderInspect.open(longCollapsedAt(2), LONG));

      await test.step('THEN its chevron and "…" sit on the node full size, clear of the title and badge', async (): Promise<void> => {
        await graphWidgets.expectCollapsedRow(LONG_FOLDER);
        await graphWidgets.expectButtonsClearOfHeader(LONG_FOLDER);
      });
    }
  );

  test(
    'GIVEN a collapsed folder, its row shows glyph, title and count badge',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the boards open with apps collapsed', async (): Promise<void> =>
        graphFolderInspect.open(APPS_COLLAPSED, BOARDS));

      await test.step('THEN its row holds the chevron and "…" on the node, with the glyph, the whole title and the badge between', async (): Promise<void> => {
        await graphWidgets.expectCollapsedRow('apps');
        await graphWidgets.expectCollapsedHeader('apps');
      });

      await test.step('AND its row meets no other header row', async (): Promise<void> => graphWidgets.expectRowsApart(2));
    }
  );

  test(
    'GIVEN a collapsed folder with a 40+ character path, the title is cut in the row, the badge is whole and the buttons stay inside the node',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the page opens with the node collapsed at zoom 1', async (): Promise<void> =>
        graphFolderInspect.open(longCollapsedAt(1), LONG));

      await test.step('THEN the title ends in "…", the badge is whole, and the chevron and "…" sit on the node', async (): Promise<void> => {
        await graphWidgets.expectCollapsedRow(LONG_FOLDER);
        await graphWidgets.expectTitleEllipsis(LONG_FOLDER);
        await graphWidgets.expectBadgeWhole(LONG_FOLDER);
        await graphWidgets.expectButtonsClearOfHeader(LONG_FOLDER);
      });
    }
  );

  test(
    'GIVEN a collapsed folder with a long title, the canvas draws its label only while its row is hidden',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the page opens with the node collapsed at zoom 0.5, drawn 110 px wide', async (): Promise<void> =>
        graphFolderInspect.open(longCollapsedAt(ROW_LESS_ZOOM), LONG));

      await test.step('THEN it shows no header button', async (): Promise<void> => graphWidgets.expectHeaderHidden(LONG_FOLDER));

      await test.step('AND the canvas draws its cut title over "1 package"', async (): Promise<void> =>
        graphWidgets.expectCanvasLabel(LONG_FOLDER, 1));

      await test.step('WHEN the page opens with the node collapsed at zoom 1', async (): Promise<void> =>
        graphFolderInspect.open(longCollapsedAt(1), LONG));

      await test.step('THEN its row shows on the node', async (): Promise<void> => graphWidgets.expectCollapsedRow(LONG_FOLDER));

      await test.step('AND the canvas draws no label on it', async (): Promise<void> => graphWidgets.expectNoCanvasLabel(LONG_FOLDER));
    }
  );

  test(
    'GIVEN a collapsed node drawn under 120 px wide at zoom 0.537, selecting it and thickening its border shows no buttons',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the page opens with the node collapsed at zoom 0.537', async (): Promise<void> =>
        graphFolderInspect.open(longCollapsedAt(SELECTED_BORDER_ZOOM), LONG));

      await test.step('THEN it shows no header button', async (): Promise<void> => graphWidgets.expectHeaderHidden(LONG_FOLDER));

      await test.step('WHEN the node is tapped', async (): Promise<void> => graphFolderInspect.tapFolder(LONG_FOLDER));

      await test.step('THEN it is selected and still shows no header button', async (): Promise<void> => {
        await graphFolderInspect.expectFolderState(LONG_FOLDER, 'selected');
        await graphWidgets.expectHeaderStaysHidden(LONG_FOLDER);
      });
    }
  );

  test(
    'GIVEN 12 packages in one folder at a 106 px row, the glyph hides and the 2-digit badge stays whole in the row',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the folder opens at zoom 1.075', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(DEEP.hash, { zoom: DEEP_NARROW_ZOOM, pan: DEEP_PAN }), DEEP));

      await test.step('THEN its row is 104 to 110 px wide', async (): Promise<void> =>
        graphWidgets.expectRowWidthIn('deep', NARROW_ROW_MIN_PX, NARROW_ROW_MAX_PX));

      await test.step('AND the glyph is hidden, the badge is whole and reachable by a pointer, and the buttons sit on the box', async (): Promise<void> => {
        await graphWidgets.expectGlyphShown('deep', false);
        await graphWidgets.expectBadgeWhole('deep');
        await graphWidgets.expectBadgeHittable('deep');
        await graphWidgets.expectRowFollowsBox('deep');
      });
    }
  );

  test(
    'GIVEN 12 packages in one folder at a 145 px row, the glyph shows and the badge stays whole in the row',
    { annotation: C9 },
    async ({ graphFolderInspect, graphWidgets }): Promise<void> => {
      await test.step('WHEN the folder opens at zoom 1.4185', async (): Promise<void> =>
        graphFolderInspect.open(savedWith(DEEP.hash, { zoom: DEEP_WIDE_ZOOM, pan: DEEP_PAN }), DEEP));

      await test.step('THEN its row is 140 to 150 px wide', async (): Promise<void> =>
        graphWidgets.expectRowWidthIn('deep', WIDE_ROW_MIN_PX, WIDE_ROW_MAX_PX));

      await test.step('AND the glyph shows, the badge is whole and reachable by a pointer, and the buttons sit on the box', async (): Promise<void> => {
        await graphWidgets.expectGlyphShown('deep', true);
        await graphWidgets.expectBadgeWhole('deep');
        await graphWidgets.expectBadgeHittable('deep');
        await graphWidgets.expectRowFollowsBox('deep');
      });
    }
  );
});
