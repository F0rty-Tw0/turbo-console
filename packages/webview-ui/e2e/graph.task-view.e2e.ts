import { expect, test } from './graph-task-view.fixture.ts';
import { SINGLE_PACKAGE_TASKS_STUB } from './test/stubs/graph-single-package.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { scriptsTasksState } from './test/utils/graph-scripts.spec.util.ts';
import { TASK_CANVAS_TASK_IDS, taskCanvasState } from './test/utils/graph-task-canvas.spec.util.ts';
import { APP_TASK_NAME, ROOT_TASK_NAME, taskRootState } from './test/utils/graph-task-root.spec.util.ts';
import type { GraphSetViewToggleMessage } from '../src/bridge/common/graph-message.type.ts';
import { folderTitleOf } from '../src/graph/utils/controls-text.util.ts';

const TASK_VIEW = { description: 'U5 spec D13 (View), §5 row 19', type: 'requirement' };

const SCOPE_UNTICKED: GraphSetViewToggleMessage = { type: 'setViewToggle', toggle: 'scope', shown: false };

const SCRIPTS_TICKED: GraphSetViewToggleMessage = { type: 'setViewToggle', toggle: 'scripts', shown: true };

const BOTH_TASKS = [`//#${ROOT_TASK_NAME}`, `@org/app#${APP_TASK_NAME}`];

const CANVAS_STATE = taskCanvasState();

/** The root folder first, then by code unit, as the probe sorts them. */
const FOLDER_TITLES = [folderTitleOf(''), folderTitleOf('apps'), folderTitleOf('packages')];

test.describe('FEATURE: the task Controls View section', () => {
  test(
    'GIVEN task mode THEN the Controls panel lists Search then View, and the View boxes read the state',
    { annotation: TASK_VIEW },
    async ({ graphControls, graphHost, graphPage, graphProbe, graphTask, graphTaskView }): Promise<void> => {
      const state = scriptsTasksState(true);

      await test.step('GIVEN a listing with a script, scopes shown, opened from a flat saved view', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(state);
        await graphProbe.expectNodeIds(stateNamesOf(state));
      });

      await test.step('WHEN Tasks is pressed', async (): Promise<void> => graphTask.enter());

      await test.step('THEN the sections read Search then View', async (): Promise<void> =>
        graphTaskView.expectSectionTitles(['Search', 'View']));

      await test.step('AND Show package scopes and Show scripts are ticked and Group by folder is not', async (): Promise<void> => {
        await graphControls.expectScope(true);
        await graphTaskView.expectScripts(true);
        await expect(graphControls.grouping).not.toBeChecked();
      });
    }
  );

  test(
    'GIVEN the listing has no script THEN Show scripts is absent; hidden but listed THEN present and unticked, and it stays after scripts are hidden',
    { annotation: TASK_VIEW },
    async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskView }): Promise<void> => {
      await test.step('GIVEN task mode over a listing of turbo tasks only', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(stateNamesOf(TASK_MODE_STATE_STUB));
        await graphTask.enter();
      });

      await test.step('THEN Show scripts is absent', async (): Promise<void> => graphTaskView.expectScriptsAbsent());

      await test.step('WHEN the same-hash state lists scripts that are hidden', async (): Promise<void> =>
        graphHost.sendState(scriptsTasksState(false)));

      await test.step('THEN Show scripts is present and unticked', async (): Promise<void> => graphTaskView.expectScripts(false));

      await test.step('WHEN the same-hash state shows the scripts', async (): Promise<void> =>
        graphHost.sendState(scriptsTasksState(true)));

      await test.step('THEN Show scripts is ticked', async (): Promise<void> => graphTaskView.expectScripts(true));

      await test.step('WHEN the scripts are hidden again', async (): Promise<void> => graphHost.sendState(scriptsTasksState(false)));

      await test.step('THEN the box stays, unticked', async (): Promise<void> => graphTaskView.expectScripts(false));
    }
  );

  test(
    'GIVEN scopes shown WHEN Show package scopes is unticked THEN exactly one setViewToggle goes out, and the host answer posts none',
    { annotation: TASK_VIEW },
    async ({ graphControls, graphHost, graphPage, graphProbe, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('GIVEN the root // and @org/app drawn in task mode with scopes shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(taskRootState(true));
        await graphProbe.expectNodeIds(['@org/app']);
        await graphTaskHost.sendShowTasks(BOTH_TASKS);
        await graphTaskProbe.expectText('pkg:@org/app', '@org/app');
      });

      await test.step('WHEN Show package scopes is unticked', async (): Promise<void> => graphControls.scope.uncheck());

      await test.step('THEN one setViewToggle goes out', async (): Promise<void> => graphControls.expectViewToggles([SCOPE_UNTICKED]));

      await test.step('WHEN the host answers with the same-hash state hiding scopes', async (): Promise<void> =>
        graphHost.sendState(taskRootState(false)));

      await test.step('THEN the box reads the bare name, the box is unticked and still only the one message went out', async (): Promise<void> => {
        await graphTaskProbe.expectText('pkg:@org/app', 'app');
        await graphControls.expectViewToggles([SCOPE_UNTICKED]);
        await graphControls.expectScope(false);
      });
    }
  );

  test(
    'GIVEN scripts hidden WHEN Show scripts is ticked THEN one setViewToggle(scripts, true) goes out and the answer posts none',
    { annotation: TASK_VIEW },
    async ({ graphControls, graphHost, graphPage, graphProbe, graphTask, graphTaskView }): Promise<void> => {
      await test.step('GIVEN task mode over a listing with scripts that are hidden', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scriptsTasksState(false));
        await graphProbe.expectNodeIds(stateNamesOf(TASK_MODE_STATE_STUB));
        await graphTask.enter();
        await graphTaskView.expectScripts(false);
      });

      await test.step('WHEN Show scripts is ticked', async (): Promise<void> => graphTaskView.scripts.check());

      await test.step('THEN one setViewToggle goes out', async (): Promise<void> => graphControls.expectViewToggles([SCRIPTS_TICKED]));

      await test.step('WHEN the host answers with the scripts shown', async (): Promise<void> =>
        graphHost.sendState(scriptsTasksState(true)));

      await test.step('THEN the box is ticked and still only the one message went out', async (): Promise<void> => {
        await graphTaskView.expectScripts(true);
        await graphControls.expectViewToggles([SCRIPTS_TICKED]);
      });
    }
  );

  test(
    'GIVEN the tree flips scopes WHEN a same-hash state arrives THEN the box follows and nothing is posted',
    { annotation: TASK_VIEW },
    async ({ graphControls, graphHost, graphPage, graphProbe, graphTaskHost }): Promise<void> => {
      await test.step('GIVEN task mode drawn with scopes shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(taskRootState(true));
        await graphProbe.expectNodeIds(['@org/app']);
        await graphTaskHost.sendShowTasks(BOTH_TASKS);
        await graphControls.expectScope(true);
      });

      await test.step('WHEN the tree flips scopes and the host sends the same-hash state', async (): Promise<void> =>
        graphHost.sendState(taskRootState(false)));

      await test.step('THEN the box is unticked and nothing was posted', async (): Promise<void> => {
        await graphControls.expectScope(false);
        await graphControls.expectViewToggles([]);
      });
    }
  );

  test(
    'GIVEN a grouped saved view WHEN task mode draws every task THEN Group by folder is ticked; unticking it removes the folder boxes and saves grouped false; ticking it brings them back',
    { annotation: TASK_VIEW },
    async ({ graphGrouping, graphHost, graphPage, graphProbe, graphTask, graphTaskBoxes, graphTaskProbe }): Promise<void> => {
      await test.step('GIVEN the package graph opened from a grouped saved view', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(CANVAS_STATE.hash) });
        await graphHost.sendState(CANVAS_STATE);
        await graphProbe.expectNodeIds(stateNamesOf(CANVAS_STATE));
      });

      await test.step('WHEN Tasks is pressed and every task is chosen', async (): Promise<void> => {
        await graphTask.enter();
        await graphTask.clickShowEvery();
        await graphTaskProbe.expectTaskIds(TASK_CANVAS_TASK_IDS);
      });

      await test.step('THEN Group by folder is ticked and the folder boxes are drawn', async (): Promise<void> => {
        await expect(graphGrouping.checkbox).toBeChecked();
        await graphTaskBoxes.expectFolderTitles(FOLDER_TITLES);
      });

      await test.step('WHEN Group by folder is unticked THEN no folder box is drawn and grouped false is saved', async (): Promise<void> => {
        await graphGrouping.setGrouped(false);
        await graphTaskBoxes.expectFolderTitles([]);
        await graphGrouping.expectGroupedSaved(false);
      });

      await test.step('WHEN Group by folder is ticked again THEN the folder boxes come back', async (): Promise<void> => {
        await graphGrouping.setGrouped(true);
        await graphTaskBoxes.expectFolderTitles(FOLDER_TITLES);
      });
    }
  );

  test(
    'GIVEN a single-package root THEN the View section has no Group by folder box',
    { annotation: TASK_VIEW },
    async ({ graphHost, graphPage, graphTaskProbe, graphTaskView }): Promise<void> => {
      await test.step('WHEN a single-package state is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(SINGLE_PACKAGE_TASKS_STUB);
        await graphTaskProbe.expectBoxIds(['pkg://']);
      });

      await test.step('THEN there is no Group by folder box', async (): Promise<void> => graphTaskView.expectGroupingAbsent());
    }
  );
});
