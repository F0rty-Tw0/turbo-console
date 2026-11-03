import { test } from './graph-task-projects.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { scriptsTasksState } from './test/utils/graph-scripts.spec.util.ts';
import { OVER_CAP_ROOT_TASK, overCapTaskIds, overCapTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskCanvasState } from './test/utils/graph-task-canvas.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const CHECKS = { description: 'U5 spec D13 T2, §5 rows 16, 18 and 23', type: 'requirement' };

const CANVAS_STATE = taskCanvasState();

const STUB_HASH = TASK_MODE_STATE_STUB.hash;

test.describe('FEATURE: the task Controls Projects grid checks choose tasks', () => {
  test(
    'GIVEN nothing chosen, checking a project draws its tasks and the tasks they need',
    { annotation: CHECKS },
    async ({ graphTask, graphTaskHost, graphTaskProbe, graphTaskProjects, openState }): Promise<void> => {
      await test.step('WHEN the canvas state opens', async (): Promise<void> => openState(CANVAS_STATE));

      await test.step('AND Tasks is pressed', async (): Promise<void> => graphTask.enter());

      await test.step('THEN the prompt shows', async (): Promise<void> => graphTask.expectPrompt());

      await test.step('WHEN the web project is checked', async (): Promise<void> => graphTaskProjects.check('Choose tasks of web'));

      await test.step('THEN the prompt is gone', async (): Promise<void> => graphTask.expectPrompt(false));

      await test.step('AND web with what it needs is drawn', async (): Promise<void> =>
        graphTaskProbe.expectTaskIds(['core#build', 'ui#build', 'web#build', 'web#dev']));

      await test.step('AND the web project reads checked', async (): Promise<void> =>
        graphTaskProjects.expectCheck('Choose tasks of web', true));

      await test.step('AND the choice is saved', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ chosen: ['web#build', 'web#dev'] }));
    }
  );

  test(
    'GIVEN one project chosen, unchecking it shows the Show every task prompt with the pool count, and checking it again draws it',
    { annotation: CHECKS },
    async ({ graphTask, graphTaskHost, graphTaskProbe, graphTaskProjects, openState }): Promise<void> => {
      await test.step('WHEN the canvas state opens', async (): Promise<void> => openState(CANVAS_STATE));

      await test.step('AND the host shows root-lib#build', async (): Promise<void> => graphTaskHost.sendShowTasks(['root-lib#build']));

      await test.step('AND the root-lib project is unchecked', async (): Promise<void> =>
        graphTaskProjects.uncheck('Choose tasks of root-lib'));

      await test.step('THEN the prompt shows', async (): Promise<void> => graphTask.expectPrompt());

      await test.step('AND it offers all six tasks', async (): Promise<void> => graphTask.expectShowEvery('Show every task (6)'));

      await test.step('AND the empty choice is saved', async (): Promise<void> => graphTaskHost.expectSavedTask({ chosen: [] }));

      await test.step('WHEN the root-lib project is checked again', async (): Promise<void> =>
        graphTaskProjects.check('Choose tasks of root-lib'));

      await test.step('THEN root-lib#build is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(['root-lib#build']));

      await test.step('AND the prompt is gone', async (): Promise<void> => graphTask.expectPrompt(false));
    }
  );

  test(
    'GIVEN a mixed project, activating its check chooses all its tasks',
    { annotation: CHECKS },
    async ({ graphTaskHost, graphTaskProjects, openState }): Promise<void> => {
      await test.step('WHEN the canvas state opens', async (): Promise<void> => openState(CANVAS_STATE));

      await test.step('AND the host shows web#build only', async (): Promise<void> => graphTaskHost.sendShowTasks(['web#build']));

      await test.step('THEN the web project reads mixed', async (): Promise<void> =>
        graphTaskProjects.expectMixed('Choose tasks of web'));

      await test.step('WHEN its check is activated', async (): Promise<void> => graphTaskProjects.check('Choose tasks of web'));

      await test.step('THEN it reads checked', async (): Promise<void> => graphTaskProjects.expectCheck('Choose tasks of web', true));

      await test.step('AND both tasks are saved as chosen', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ chosen: ['web#build', 'web#dev'] }));
    }
  );

  test(
    'GIVEN a grouped grid, checking a folder chooses every project in it',
    { annotation: CHECKS },
    async ({ graphTaskHost, graphTaskProbe, graphTaskProjects, openState }): Promise<void> => {
      await test.step('WHEN the grouped saved view opens on the canvas state', async (): Promise<void> =>
        openState(CANVAS_STATE, groupedSavedState(CANVAS_STATE.hash)));

      await test.step('AND the host shows root-lib#build', async (): Promise<void> => graphTaskHost.sendShowTasks(['root-lib#build']));

      await test.step('AND the packages folder is checked', async (): Promise<void> =>
        graphTaskProjects.check('Choose tasks of folder packages'));

      await test.step('THEN root-lib#build, the tasks of core and ui and web#build, which needs ui#build, are drawn', async (): Promise<void> =>
        graphTaskProbe.expectTaskIds(['root-lib#build', 'core#build', 'ui#build', 'web#build']));

      await test.step('AND the packages folder reads checked', async (): Promise<void> =>
        graphTaskProjects.expectCheck('Choose tasks of folder packages', true));

      await test.step('AND the apps folder reads unchecked', async (): Promise<void> =>
        graphTaskProjects.expectCheck('Choose tasks of folder apps', false));
    }
  );

  test(
    'GIVEN 401 tasks drawn with the cap lifted, unchecking a project keeps the cap lifted',
    { annotation: CHECKS },
    async ({ graphHost, graphPage, graphTask, graphTaskHost, graphTaskProbe, graphTaskProjects }): Promise<void> => {
      const state = overCapTasksState();
      const savedState = taskSavedState(state.hash, { chosen: [OVER_CAP_ROOT_TASK], capLifted: true });

      await test.step('WHEN the cap-lifted view of root#build opens', async (): Promise<void> => graphPage.open({ savedState }));

      await test.step('AND the over-cap state arrives', async (): Promise<void> => graphHost.sendState(state));

      await test.step('THEN every task is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(overCapTaskIds()));

      await test.step('WHEN the leaf project is checked', async (): Promise<void> => graphTaskProjects.check('Choose tasks of leaf'));

      await test.step('AND the leaf project is unchecked', async (): Promise<void> =>
        graphTaskProjects.uncheck('Choose tasks of leaf'));

      await test.step('THEN every task is still drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(overCapTaskIds()));

      await test.step('AND no banner shows', async (): Promise<void> => graphTask.expectBanner(null));

      await test.step('AND the cap is saved lifted', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ capLifted: true, chosen: [OVER_CAP_ROOT_TASK] }));
    }
  );

  test(
    'GIVEN a search, the projects with a matching task open and list only those tasks, and clearing the search closes them again',
    { annotation: CHECKS },
    async ({ graphTask, graphTaskHost, graphTaskProjects, openState }): Promise<void> => {
      await test.step('WHEN the task mode state opens', async (): Promise<void> => openState(TASK_MODE_STATE_STUB));

      await test.step('AND the host shows lib#build', async (): Promise<void> => graphTaskHost.sendShowTasks(['lib#build']));

      await test.step('AND test is searched', async (): Promise<void> => graphTask.search('test'));

      await test.step('THEN lib and ui are open on their matching tasks', async (): Promise<void> =>
        graphTaskProjects.expectLines(['lib (2)', 'lib#test', 'ui (2)', 'ui#test']));

      await test.step('WHEN the search is cleared', async (): Promise<void> => graphTask.search(''));

      await test.step('THEN the projects are collapsed again', async (): Promise<void> =>
        graphTaskProjects.expectLines(['app (2)', 'lib (2)', 'ui (2)']));
    }
  );

  test(
    'GIVEN a hidden script chosen with all of app, unchecking app keeps the script id in the saved choice',
    { annotation: CHECKS },
    async ({ graphHost, graphPage, graphTask, graphTaskHost, graphTaskProjects }): Promise<void> => {
      const savedState = taskSavedState(STUB_HASH, { chosen: ['app#dev', 'app#build', 'app#lint'] });

      await test.step('WHEN the view of app#dev, a hidden script, with the build and lint of app opens', async (): Promise<void> =>
        graphPage.open({ savedState }));

      await test.step('AND the scripts state arrives with scripts hidden', async (): Promise<void> =>
        graphHost.sendState(scriptsTasksState(false)));

      await test.step('THEN the app project reads checked from its pool tasks', async (): Promise<void> =>
        graphTaskProjects.expectCheck('Choose tasks of app', true));

      await test.step('WHEN the app project is unchecked', async (): Promise<void> =>
        graphTaskProjects.uncheck('Choose tasks of app'));

      await test.step('THEN only the hidden script stays chosen', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ chosen: ['app#dev'] }));

      await test.step('AND the prompt shows', async (): Promise<void> => graphTask.expectPrompt());
    }
  );

  test(
    'GIVEN a search that lists only some projects of a folder, checking the folder chooses every task of the folder',
    { annotation: CHECKS },
    async ({ graphTask, graphTaskHost, graphTaskProjects, openState }): Promise<void> => {
      await test.step('WHEN the grouped saved view opens on the task mode state', async (): Promise<void> =>
        openState(TASK_MODE_STATE_STUB, groupedSavedState(STUB_HASH)));

      await test.step('AND the host shows lib#build', async (): Promise<void> => graphTaskHost.sendShowTasks(['lib#build']));

      await test.step('AND test is searched', async (): Promise<void> => graphTask.search('test'));

      await test.step('THEN the packages folder reads mixed', async (): Promise<void> =>
        graphTaskProjects.expectMixed('Choose tasks of folder packages'));

      await test.step('WHEN the packages folder is checked', async (): Promise<void> =>
        graphTaskProjects.check('Choose tasks of folder packages'));

      await test.step('THEN every task of the folder is chosen, the unlisted app tasks too', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ chosen: ['lib#build', 'app#build', 'app#lint', 'lib#test', 'ui#build', 'ui#test'] }));
    }
  );
});
