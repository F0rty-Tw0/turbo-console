import { expect, test } from './graph-task-view.fixture.ts';
import { SINGLE_PACKAGE_TASKS_STUB } from './test/stubs/graph-single-package.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { scriptsTasksState } from './test/utils/graph-scripts.spec.util.ts';
import { TASK_CANVAS_TASK_IDS, taskCanvasState } from './test/utils/graph-task-canvas.spec.util.ts';
import { APP_TASK_NAME, ROOT_TASK_NAME, taskRootState } from './test/utils/graph-task-root.spec.util.ts';
import type { GraphSetViewToggleMessage } from '../src/bridge/common/graph-message.type.ts';
import { PACKAGE_GLYPH } from '../src/graph/common/graph-glyph.const.ts';
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
    'GIVEN a listing with a script, scopes shown, from a flat saved view, task mode lists Search, View then Projects and the View boxes read the state',
    { annotation: TASK_VIEW },
    async ({ graphControls, graphHost, graphPage, graphProbe, graphTask, graphTaskView }): Promise<void> => {
      const state = scriptsTasksState(true);

      await test.step('WHEN a listing with a script, scopes shown, is opened from a flat saved view', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(state);
        await graphProbe.expectNodeIds(stateNamesOf(state));
      });

      await test.step('AND Tasks is pressed', async (): Promise<void> => graphTask.enter());

      await test.step('THEN the sections read Search, View then Projects', async (): Promise<void> =>
        graphTaskView.expectSectionTitles(['Search', 'View', 'Projects']));

      await test.step('AND Show package scopes and Show scripts are ticked and Group by folder is not', async (): Promise<void> => {
        await graphControls.expectScope(true);
        await graphTaskView.expectScripts(true);
        await expect(graphControls.grouping).not.toBeChecked();
      });
    }
  );

  test(
    'GIVEN task mode over turbo tasks only, Show scripts is absent until a script is listed, then stays while scripts are hidden',
    { annotation: TASK_VIEW },
    async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskView }): Promise<void> => {
      await test.step('WHEN task mode opens over a listing of turbo tasks only', async (): Promise<void> => {
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
    'GIVEN task mode with scopes shown, unticking Show package scopes posts exactly one setViewToggle and the host answer posts none',
    { annotation: TASK_VIEW },
    async ({ graphControls, graphHost, graphPage, graphProbe, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the root // and @org/app are drawn in task mode with scopes shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(taskRootState(true));
        await graphProbe.expectNodeIds(['@org/app']);
        await graphTaskHost.sendShowTasks(BOTH_TASKS);
        await graphTaskProbe.expectText('pkg:@org/app', `${PACKAGE_GLYPH} @org/app`);
      });

      await test.step('AND Show package scopes is unticked', async (): Promise<void> => graphControls.scope.uncheck());

      await test.step('THEN one setViewToggle goes out', async (): Promise<void> => graphControls.expectViewToggles([SCOPE_UNTICKED]));

      await test.step('WHEN the host answers with the same-hash state hiding scopes', async (): Promise<void> =>
        graphHost.sendState(taskRootState(false)));

      await test.step('THEN the box reads the bare name, the box is unticked and still only the one message went out', async (): Promise<void> => {
        await graphTaskProbe.expectText('pkg:@org/app', `${PACKAGE_GLYPH} app`);
        await graphControls.expectViewToggles([SCOPE_UNTICKED]);
        await graphControls.expectScope(false);
      });
    }
  );

  test(
    'GIVEN task mode with scripts hidden, ticking Show scripts posts one setViewToggle(scripts, true) and the answer posts none',
    { annotation: TASK_VIEW },
    async ({ graphControls, graphHost, graphPage, graphProbe, graphTask, graphTaskView }): Promise<void> => {
      await test.step('WHEN task mode opens over a listing with scripts that are hidden', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(scriptsTasksState(false));
        await graphProbe.expectNodeIds(stateNamesOf(TASK_MODE_STATE_STUB));
        await graphTask.enter();
        await graphTaskView.expectScripts(false);
      });

      await test.step('AND Show scripts is ticked', async (): Promise<void> => graphTaskView.scripts.check());

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
    'GIVEN task mode drawn with scopes shown, a tree flip of scopes moves the box and posts nothing',
    { annotation: TASK_VIEW },
    async ({ graphControls, graphHost, graphPage, graphProbe, graphTaskHost }): Promise<void> => {
      await test.step('WHEN task mode is drawn with scopes shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(taskRootState(true));
        await graphProbe.expectNodeIds(['@org/app']);
        await graphTaskHost.sendShowTasks(BOTH_TASKS);
        await graphControls.expectScope(true);
      });

      await test.step('AND the tree flips scopes and the host sends the same-hash state', async (): Promise<void> =>
        graphHost.sendState(taskRootState(false)));

      await test.step('THEN the box is unticked and nothing was posted', async (): Promise<void> => {
        await graphControls.expectScope(false);
        await graphControls.expectViewToggles([]);
      });
    }
  );

  test(
    'GIVEN a grouped saved view, task mode ticks Group by folder, and the box removes and brings back the folder boxes',
    { annotation: TASK_VIEW },
    async ({ graphGrouping, graphHost, graphPage, graphProbe, graphTask, graphTaskBoxes, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the package graph opens from a grouped saved view', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(CANVAS_STATE.hash) });
        await graphHost.sendState(CANVAS_STATE);
        await graphProbe.expectNodeIds(stateNamesOf(CANVAS_STATE));
      });

      await test.step('AND Tasks is pressed and every task is chosen', async (): Promise<void> => {
        await graphTask.enter();
        await graphTask.clickShowEvery();
        await graphTaskProbe.expectTaskIds(TASK_CANVAS_TASK_IDS);
      });

      await test.step('THEN Group by folder is ticked and the folder boxes are drawn', async (): Promise<void> => {
        await expect(graphGrouping.checkbox).toBeChecked();
        await graphTaskBoxes.expectFolderTitles(FOLDER_TITLES);
      });

      await test.step('WHEN Group by folder is unticked', async (): Promise<void> => graphGrouping.setGrouped(false));

      await test.step('THEN no folder box is drawn and grouped false is saved', async (): Promise<void> => {
        await graphTaskBoxes.expectFolderTitles([]);
        await graphGrouping.expectGroupedSaved(false);
      });

      await test.step('WHEN Group by folder is ticked again', async (): Promise<void> => graphGrouping.setGrouped(true));

      await test.step('THEN the folder boxes come back', async (): Promise<void> => graphTaskBoxes.expectFolderTitles(FOLDER_TITLES));
    }
  );

  test(
    'GIVEN a single-package root, the task View section has no Group by folder box',
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
