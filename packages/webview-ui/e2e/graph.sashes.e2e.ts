import { OVERLAY_WIDTH_PX } from './common/graph.const.ts';
import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { SAVED_BASE_STUB } from './test/stubs/graph-saved.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { placedBoardsState } from './test/utils/graph-folder-states.spec.util.ts';
import { savedWith } from './test/utils/graph-saved-state.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const AC2 = { description: 'U3 AC2', type: 'requirement' };

const BOARDS = placedBoardsState();

/** Docked with the body 960 px wide: the first width the sum rule has to squeeze 400 + 400 at. */
const DOCKED_EDGE_PX = 960;

const NARROW_PX = 700;

const WIDE_WIDTHS = { controls: 400, details: 400 };

const WIDE_SAVED = { ...SAVED_BASE_STUB, panelWidths: WIDE_WIDTHS };

const SAVED_WIDTHS = { controls: 320, details: 300 };

const SAVED_PACKAGES = { ...SAVED_BASE_STUB, panelWidths: SAVED_WIDTHS };

const TASK_SAVED = taskSavedState('7a5c0001', { chosen: ['app#build'] });

const SAVED_TASKS = { ...TASK_SAVED, panelWidths: SAVED_WIDTHS };

test.describe('FEATURE: graph panel sashes', () => {
  test(
    'GIVEN the details graph sent, both sashes show at the default widths and point at the package panels',
    { annotation: AC2 },
    async ({ graphHost, graphPage, graphSashes }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN the Controls sash reads 260 with a 200 minimum', async (): Promise<void> =>
        graphSashes.expectValue('controls', { now: 260, min: 200 }));

      await test.step('AND the Details sash reads 280 with a 200 minimum', async (): Promise<void> =>
        graphSashes.expectValue('details', { now: 280, min: 200 }));

      await test.step('AND the Controls sash controls graph-controls', async (): Promise<void> =>
        graphSashes.expectControls('controls', 'graph-controls'));

      await test.step('AND the Details sash controls graph-details', async (): Promise<void> =>
        graphSashes.expectControls('details', 'graph-details'));
    }
  );

  test(
    'GIVEN the details graph sent, a sash is hidden while its panel is closed',
    { annotation: AC2 },
    async ({ graphControls, graphDetails, graphHost, graphPage, graphSashes }): Promise<void> => {
      await test.step('GIVEN the page opened on the details graph', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('WHEN the Controls panel is closed', async (): Promise<void> => graphControls.toggle());

      await test.step('THEN the Controls sash is hidden', async (): Promise<void> => graphSashes.expectShown('controls', false));

      await test.step('AND the Details sash still shows', async (): Promise<void> => graphSashes.expectShown('details', true));

      await test.step('WHEN the Details panel is closed', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the Details sash is hidden', async (): Promise<void> => graphSashes.expectShown('details', false));
    }
  );

  test(
    'GIVEN saved widths of 320 and 300, the package panels are drawn at them on load',
    { annotation: AC2 },
    async ({ graphHost, graphPage, graphSashes }): Promise<void> => {
      await test.step('WHEN the page is opened with the saved widths and the details graph is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: SAVED_PACKAGES });
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN the Controls panel is 320px wide', async (): Promise<void> =>
        graphSashes.expectPanelWidth('graph-controls', 320));

      await test.step('AND the Details panel is 300px wide', async (): Promise<void> =>
        graphSashes.expectPanelWidth('graph-details', 300));
    }
  );

  test(
    'GIVEN saved widths in task mode, the task Controls panel gets the width and its sash points at it',
    { annotation: AC2 },
    async ({ graphHost, graphPage, graphSashes }): Promise<void> => {
      await test.step('WHEN the page is opened in task mode with the saved widths', async (): Promise<void> => {
        await graphPage.open({ savedState: SAVED_TASKS });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
      });

      await test.step('THEN the Controls sash controls graph-task-controls', async (): Promise<void> =>
        graphSashes.expectControls('controls', 'graph-task-controls'));

      await test.step('AND the task Controls panel is 320px wide', async (): Promise<void> =>
        graphSashes.expectPanelWidth('graph-task-controls', 320));
    }
  );

  test(
    'GIVEN the wide editor, dragging both sashes saves the widths, a reload keeps them and a double click resets them',
    { annotation: AC2 },
    async ({ graphHost, graphPage, graphSashes }): Promise<void> => {
      await test.step('GIVEN the page opened on the details graph', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('WHEN the Controls sash is dragged 60px right and the Details sash 40px left', async (): Promise<void> => {
        await graphSashes.drag('controls', 60);
        await graphSashes.drag('details', -40);
      });

      await test.step('THEN both panels are 320px wide', async (): Promise<void> => {
        await graphSashes.expectPanelWidth('graph-controls', 320);
        await graphSashes.expectPanelWidth('graph-details', 320);
      });

      await test.step('AND both widths are saved', async (): Promise<void> =>
        graphSashes.expectSaved({ controls: 320, details: 320 }));

      await test.step('WHEN the page is reopened from the saved state', async (): Promise<void> => {
        await graphHost.reopen();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN both panels are still 320px wide', async (): Promise<void> => {
        await graphSashes.expectPanelWidth('graph-controls', 320);
        await graphSashes.expectPanelWidth('graph-details', 320);
      });

      await test.step('WHEN both sashes are double-clicked', async (): Promise<void> => {
        await graphSashes.doubleClick('controls');
        await graphSashes.doubleClick('details');
      });

      await test.step('THEN the panels are back to 260 and 280', async (): Promise<void> => {
        await graphSashes.expectPanelWidth('graph-controls', 260);
        await graphSashes.expectPanelWidth('graph-details', 280);
      });

      await test.step('AND the defaults are saved', async (): Promise<void> =>
        graphSashes.expectSaved({ controls: 260, details: 280 }));
    }
  );

  test(
    'GIVEN the wide editor, the arrow, Home and End keys resize a sash and every other key leaves it alone',
    { annotation: AC2 },
    async ({ graphCanvas, graphHost, graphPage, graphSashes }): Promise<void> => {
      await test.step('GIVEN the page opened on the details graph with web selected', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphCanvas.tapNode('web');
      });

      await test.step('WHEN Details gets ArrowLeft, ArrowRight and ArrowUp', async (): Promise<void> => {
        await graphSashes.press('details', 'ArrowLeft');
        await graphSashes.expectPanelWidth('graph-details', 296);
        await graphSashes.press('details', 'ArrowRight');
        await graphSashes.expectPanelWidth('graph-details', 280);
        await graphSashes.press('details', 'ArrowUp');
      });

      await test.step('THEN ArrowUp left Details at 280', async (): Promise<void> =>
        graphSashes.expectPanelWidth('graph-details', 280));

      await test.step('WHEN Details gets Home', async (): Promise<void> => graphSashes.press('details', 'Home'));

      await test.step('THEN Details is 200px wide', async (): Promise<void> => graphSashes.expectPanelWidth('graph-details', 200));

      await test.step('AND every Details action button still fits its label', async (): Promise<void> =>
        graphSashes.expectDetailsButtonsFit());

      await test.step('WHEN Controls gets ArrowRight, ArrowLeft and ArrowDown', async (): Promise<void> => {
        await graphSashes.press('controls', 'ArrowRight');
        await graphSashes.expectPanelWidth('graph-controls', 276);
        await graphSashes.press('controls', 'ArrowLeft');
        await graphSashes.expectPanelWidth('graph-controls', 260);
        await graphSashes.press('controls', 'ArrowDown');
      });

      await test.step('THEN ArrowDown left Controls at 260', async (): Promise<void> =>
        graphSashes.expectPanelWidth('graph-controls', 260));

      await test.step('WHEN Controls gets End', async (): Promise<void> => graphSashes.press('controls', 'End'));

      await test.step('THEN Controls is half the 1280px body and its max', async (): Promise<void> => {
        await graphSashes.expectPanelWidth('graph-controls', 640);
        await graphSashes.expectValue('controls', { now: 640, max: 640 });
      });

      await test.step('AND the key widths are saved', async (): Promise<void> =>
        graphSashes.expectSaved({ controls: 640, details: 200 }));
    }
  );

  test(
    'GIVEN the Details overlay over a folder box, a Details drag moves the widget bounds and keys and a double click resize it',
    { annotation: AC2 },
    async ({ graphFolderInspect, graphNarrow, graphSashes, graphWidgets }): Promise<void> => {
      await test.step('GIVEN a 959px editor with the grouped boards open and Controls closed', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphFolderInspect.open(savedWith(BOARDS.hash, { controlsOpen: false }), BOARDS);
      });

      await test.step('AND the apps box is panned so the 280px overlay covers its "…"', async (): Promise<void> => {
        await graphWidgets.panBoxUnderOverlay('apps');
        await graphWidgets.expectEllipsisUnderOverlay('apps');
      });

      await test.step('WHEN the Details sash is dragged 80px right', async (): Promise<void> => graphSashes.drag('details', 80));

      await test.step('THEN Details is 200px wide', async (): Promise<void> => graphSashes.expectPanelWidth('graph-details', 200));

      await test.step('AND the "…" no longer sits under the overlay and shows', async (): Promise<void> =>
        graphSashes.expectEllipsisShown('apps'));

      await test.step('WHEN Details gets ArrowLeft', async (): Promise<void> => graphSashes.press('details', 'ArrowLeft'));

      await test.step('THEN Details is 216px wide', async (): Promise<void> => graphSashes.expectPanelWidth('graph-details', 216));

      await test.step('WHEN the Details sash is double-clicked', async (): Promise<void> => graphSashes.doubleClick('details'));

      await test.step('THEN Details is 280px wide', async (): Promise<void> => graphSashes.expectPanelWidth('graph-details', 280));
    }
  );

  test(
    'GIVEN saved widths of 400 and 400, a window resize re-clamps without saving and a squeezed side keeps its saved width',
    { annotation: AC2 },
    async ({ graphHost, graphNarrow, graphPage, graphSashes }): Promise<void> => {
      await test.step('GIVEN both panels drawn at 400 in the wide editor', async (): Promise<void> => {
        await graphPage.open({ savedState: WIDE_SAVED });
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('WHEN the editor narrows to 960px, still docked', async (): Promise<void> =>
        graphNarrow.setWidth(DOCKED_EDGE_PX));

      await test.step('THEN Controls gives 200 and Details 60, drawn at 200 and 340', async (): Promise<void> => {
        await graphSashes.expectPanelWidth('graph-controls', 200);
        await graphSashes.expectPanelWidth('graph-details', 340);
      });

      await test.step('AND the saved 400 and 400 are untouched', async (): Promise<void> => graphSashes.expectStillSaved(WIDE_WIDTHS));

      await test.step('WHEN the editor narrows to 959px, the Details overlay', async (): Promise<void> =>
        graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('THEN both are drawn at their saved 400', async (): Promise<void> => {
        await graphSashes.expectPanelWidth('graph-details', 400);
        await graphSashes.expectPanelWidth('graph-controls', 400);
      });

      await test.step('WHEN the editor narrows to 700px', async (): Promise<void> => graphNarrow.setWidth(NARROW_PX));

      await test.step('THEN Controls fits the 280px overlay budget and Details its 350px cap', async (): Promise<void> => {
        await graphSashes.expectPanelWidth('graph-controls', 280);
        await graphSashes.expectPanelWidth('graph-details', 350);
      });

      await test.step('AND the saved 400 and 400 are still untouched', async (): Promise<void> =>
        graphSashes.expectStillSaved(WIDE_WIDTHS));

      await test.step('WHEN Details gets ArrowRight', async (): Promise<void> => graphSashes.press('details', 'ArrowRight'));

      await test.step('THEN Details 334 is saved and the squeezed Controls keeps its 400', async (): Promise<void> =>
        graphSashes.expectSaved({ controls: 400, details: 334 }));

      await test.step('WHEN the Controls sash is double-clicked', async (): Promise<void> => graphSashes.doubleClick('controls'));

      await test.step('THEN the reset Controls 260 is saved beside Details 334', async (): Promise<void> =>
        graphSashes.expectSaved({ controls: 260, details: 334 }));

      await test.step('WHEN the editor widens back to 1280px', async (): Promise<void> => graphNarrow.setWidth(1280));

      await test.step('THEN the panels are drawn at the saved 260 and 334', async (): Promise<void> => {
        await graphSashes.expectPanelWidth('graph-controls', 260);
        await graphSashes.expectPanelWidth('graph-details', 334);
      });
    }
  );
});
