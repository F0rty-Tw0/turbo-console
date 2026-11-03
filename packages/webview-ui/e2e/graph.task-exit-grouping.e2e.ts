import { test } from './graph-task-view.fixture.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { TASK_CANVAS_TASK_IDS, taskCanvasState } from './test/utils/graph-task-canvas.spec.util.ts';
import { folderTitleOf } from '../src/graph/utils/controls-text.util.ts';

const EXIT_GROUPING = { description: 'U5 spec D10 exit, §5 row 17', type: 'requirement' };

const STATE = taskCanvasState();

const PACKAGE_NAMES = stateNamesOf(STATE);

/** The root folder first, then by code unit, as the probe sorts them. */
const FOLDER_TITLES = [folderTitleOf(''), folderTitleOf('apps'), folderTitleOf('packages')];

/** Drag px that pans the fitted canvas far enough to leave a node out of view; the small graph fits at the zoom cap. */
const PAN_PX = 500;

test.describe('FEATURE: leaving task mode draws the package graph as Group by folder was last chosen', () => {
  test(
    'GIVEN the package graph grouped, unticking Group by folder in task mode leaves it flat and unticked',
    { annotation: EXIT_GROUPING },
    async ({
      graphCanvas,
      graphGrouping,
      graphHost,
      graphPage,
      graphProbe,
      graphTask,
      graphTaskBoxes,
      graphTaskProbe
    }): Promise<void> => {
      await test.step('WHEN the grouped package graph is opened, panned off the fit and saved', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(STATE.hash) });
        await graphHost.sendState(STATE);
        await graphProbe.expectNodeIds(PACKAGE_NAMES);
        await graphGrouping.expectFolderCount(3);
        await graphCanvas.panBy(PAN_PX, PAN_PX);
        await graphCanvas.expectNodeOutOfView();
        await graphHost.expectViewSaved();
      });

      await test.step('AND Tasks is pressed, every task is chosen and Group by folder is unticked', async (): Promise<void> => {
        await graphTask.enter();
        await graphTask.clickShowEvery();
        await graphTaskProbe.expectTaskIds(TASK_CANVAS_TASK_IDS);
        await graphGrouping.setGrouped(false);
        await graphTaskBoxes.expectFolderTitles([]);
      });

      await test.step('AND Packages is pressed', async (): Promise<void> => graphTask.leave());

      await test.step('THEN the package box is unticked and the package graph is flat, saved flat', async (): Promise<void> => {
        await graphGrouping.expectGrouped(false);
        await graphGrouping.expectFolderCount(0);
        await graphGrouping.expectGroupedSaved(false);
      });

      await test.step('AND the exit draw fits, not the old camera', async (): Promise<void> => graphCanvas.expectAllNodesInView());
    }
  );

  test(
    'GIVEN the package graph flat, ticking Group by folder in task mode leaves it grouped and ticked',
    { annotation: EXIT_GROUPING },
    async ({ graphGrouping, graphHost, graphPage, graphProbe, graphTask, graphTaskBoxes, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the flat package graph is opened', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(STATE);
        await graphProbe.expectNodeIds(PACKAGE_NAMES);
        await graphGrouping.expectFolderCount(0);
      });

      await test.step('AND Tasks is pressed, every task is chosen and Group by folder is ticked', async (): Promise<void> => {
        await graphTask.enter();
        await graphTask.clickShowEvery();
        await graphTaskProbe.expectTaskIds(TASK_CANVAS_TASK_IDS);
        await graphGrouping.setGrouped(true);
        await graphTaskBoxes.expectFolderTitles(FOLDER_TITLES);
      });

      await test.step('AND Packages is pressed', async (): Promise<void> => graphTask.leave());

      await test.step('THEN the package box is ticked and the package graph is grouped by folder', async (): Promise<void> => {
        await graphGrouping.expectGrouped(true);
        await graphGrouping.expectFolderCount(3);
        await graphGrouping.expectFolderPackages('apps', ['web']);
      });
    }
  );
});
