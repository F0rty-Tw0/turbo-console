import { test } from './graph-task-boxes.fixture.ts';
import { SINGLE_PACKAGE_TASKS_STUB } from './test/stubs/graph-single-package.stub.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { TASK_CANVAS_TASK_IDS, taskCanvasState } from './test/utils/graph-task-canvas.spec.util.ts';
import { ROOT_TASKS_TITLE } from '../src/graph/common/graph-task.const.ts';
import { folderTitleOf } from '../src/graph/utils/controls-text.util.ts';

const FOLDER_BOXES = { description: 'U5 spec D10, §5 row 22 (U5e part)', type: 'requirement' };

const STATE = taskCanvasState();

const PACKAGE_NAMES = stateNamesOf(STATE);

const PACKAGE_BOXES = ['pkg://', 'pkg:core', 'pkg:root-lib', 'pkg:ui', 'pkg:web'];

/** The root folder first, then by code unit, as the probe sorts them. */
const FOLDER_TITLES = [folderTitleOf(''), folderTitleOf('apps'), folderTitleOf('packages')];

/** Drag px that pans the fitted canvas far enough to leave a node out of view; the small graph fits at the zoom cap. */
const PAN_PX = 500;

test.describe('FEATURE: graph task mode draws a folder box per folder while grouped', () => {
  test.beforeEach(async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
    await test.step('GIVEN the package graph of five packages in three folders, opened from a grouped saved view', async (): Promise<void> => {
      await graphPage.open({ savedState: groupedSavedState(STATE.hash) });
      await graphHost.sendState(STATE);
      await graphProbe.expectNodeIds(PACKAGE_NAMES);
    });
  });

  test(
    'GIVEN a grouped monorepo, choosing every task draws each package box in its folder box and the root // box in the root folder',
    { annotation: FOLDER_BOXES },
    async ({ graphGrouping, graphTask, graphTaskBoxes, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN Tasks is pressed and every task is chosen', async (): Promise<void> => {
        await graphTask.enter();
        await graphTask.clickShowEvery();
        await graphTaskProbe.expectTaskIds(TASK_CANVAS_TASK_IDS);
      });

      await test.step('THEN there is one folder box per folder with a shown package, titled by folderTitleOf', async (): Promise<void> =>
        graphTaskBoxes.expectFolderTitles(FOLDER_TITLES));

      await test.step('AND each folder box holds exactly its package boxes, the // box in the root folder', async (): Promise<void> => {
        await graphGrouping.expectFolderPackages('apps', ['pkg:web']);
        await graphGrouping.expectFolderPackages('packages', ['pkg:ui', 'pkg:core']);
        await graphGrouping.expectFolderPackages('', ['pkg://', 'pkg:root-lib']);
      });

      await test.step('AND no folder or package title is clipped', async (): Promise<void> => {
        await graphTaskBoxes.expectFolderTitlesUncut();
        await graphTaskProbe.expectBoxTitlesUncut([ROOT_TASKS_TITLE, 'core', 'root-lib', 'ui', 'web']);
      });
    }
  );

  test(
    'GIVEN a grouped monorepo, unchecking Group by folder before choosing every task draws no folder box',
    { annotation: FOLDER_BOXES },
    async ({ graphGrouping, graphTask, graphTaskBoxes, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN Group by folder is unchecked, Tasks is pressed and every task is chosen', async (): Promise<void> => {
        await graphGrouping.setGrouped(false);
        await graphTask.enter();
        await graphTask.clickShowEvery();
        await graphTaskProbe.expectTaskIds(TASK_CANVAS_TASK_IDS);
      });

      await test.step('THEN every package box is drawn', async (): Promise<void> => graphTaskProbe.expectBoxIds(PACKAGE_BOXES));

      await test.step('AND no folder box holds them', async (): Promise<void> => graphTaskBoxes.expectFolderTitles([]));
    }
  );

  test(
    'GIVEN grouped task mode with a panned camera, flipping the grouping in package mode makes the camera fit the new layout',
    { annotation: FOLDER_BOXES },
    async ({ graphCanvas, graphGrouping, graphTask, graphTaskProbe, graphTaskBoxes }): Promise<void> => {
      await test.step('WHEN every task is drawn grouped and the canvas is panned off the fit', async (): Promise<void> => {
        await graphTask.enter();
        await graphTask.clickShowEvery();
        await graphTaskBoxes.expectFolderTitles(FOLDER_TITLES);
        await graphCanvas.panBy(PAN_PX, PAN_PX);
        await graphCanvas.expectNodeOutOfView();
        await graphTask.expectCameraSaved();
      });

      await test.step('AND Packages then Tasks is pressed with the grouping unchanged', async (): Promise<void> => {
        await graphTask.leave();
        await graphTask.enter();
        await graphTaskProbe.expectTaskIds(TASK_CANVAS_TASK_IDS);
      });

      await test.step('THEN the saved camera of the same layout returns', async (): Promise<void> =>
        graphCanvas.expectNodeOutOfView());

      await test.step('WHEN Packages is pressed, Group by folder unchecked and Tasks pressed', async (): Promise<void> => {
        await graphTask.leave();
        await graphGrouping.setGrouped(false);
        await graphTask.enter();
        await graphTaskProbe.expectTaskIds(TASK_CANVAS_TASK_IDS);
      });

      await test.step('THEN the layout drawn is the flat one, with no folder box', async (): Promise<void> => {
        await graphTaskProbe.expectBoxIds(PACKAGE_BOXES);
        await graphTaskBoxes.expectFolderTitles([]);
      });

      await test.step('AND the camera fits it, as the saved key no longer matches', async (): Promise<void> =>
        graphCanvas.expectAllNodesInView());
    }
  );
});

test.describe('FEATURE: the task graph of a single-package repo draws no folder box', () => {
  test(
    'GIVEN a single-package state under a grouped saved view, task mode draws no folder box',
    { annotation: FOLDER_BOXES },
    async ({ graphHost, graphPage, graphTaskProbe, graphTaskBoxes }): Promise<void> => {
      await test.step('WHEN a grouped view is opened and the single-package state is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(SINGLE_PACKAGE_TASKS_STUB.hash) });
        await graphHost.sendState(SINGLE_PACKAGE_TASKS_STUB);
      });

      await test.step('THEN its one package box is drawn', async (): Promise<void> => graphTaskProbe.expectBoxIds(['pkg://']));

      await test.step('AND no folder box holds it', async (): Promise<void> => graphTaskBoxes.expectFolderTitles([]));
    }
  );
});
