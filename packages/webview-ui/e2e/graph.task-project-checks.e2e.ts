import { test } from './graph-task-projects.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
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
    async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskHost, graphTaskProbe, graphTaskProjects }): Promise<void> => {
      await test.step('WHEN the canvas state arrives, Tasks is pressed and the prompt shows', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(CANVAS_STATE);
        await graphProbe.expectNodeIds(stateNamesOf(CANVAS_STATE));
        await graphTask.enter();
        await graphTask.expectPrompt();
      });

      await test.step('AND the web project is checked', async (): Promise<void> => graphTaskProjects.check('Choose tasks of web'));

      await test.step('THEN the prompt is gone and web with what it needs is drawn', async (): Promise<void> => {
        await graphTask.expectPrompt(false);
        await graphTaskProbe.expectTaskIds(['core#build', 'ui#build', 'web#build', 'web#dev']);
        await graphTaskProjects.expectCheck('Choose tasks of web', 'checked');
      });

      await test.step('AND the choice is saved', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ chosen: ['web#build', 'web#dev'] }));
    }
  );

  test(
    'GIVEN one project chosen, unchecking it shows the Show every task prompt with the pool count, and checking it again draws it',
    { annotation: CHECKS },
    async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskHost, graphTaskProbe, graphTaskProjects }): Promise<void> => {
      await test.step('WHEN root-lib#build is shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(CANVAS_STATE);
        await graphProbe.expectNodeIds(stateNamesOf(CANVAS_STATE));
        await graphTaskHost.sendShowTasks(['root-lib#build']);
      });

      await test.step('AND the root-lib project is unchecked', async (): Promise<void> =>
        graphTaskProjects.uncheck('Choose tasks of root-lib'));

      await test.step('THEN the prompt offers all six tasks and the empty choice is saved', async (): Promise<void> => {
        await graphTask.expectPrompt();
        await graphTask.expectShowEvery('Show every task (6)');
        await graphTaskHost.expectSavedTask({ chosen: [] });
      });

      await test.step('WHEN the root-lib project is checked again', async (): Promise<void> =>
        graphTaskProjects.check('Choose tasks of root-lib'));

      await test.step('THEN root-lib#build is drawn and the prompt is gone', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds(['root-lib#build']);
        await graphTask.expectPrompt(false);
      });
    }
  );

  test(
    'GIVEN a mixed project, activating its check chooses all its tasks',
    { annotation: CHECKS },
    async ({ graphHost, graphPage, graphProbe, graphTaskHost, graphTaskProjects }): Promise<void> => {
      await test.step('WHEN only web#build is shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(CANVAS_STATE);
        await graphProbe.expectNodeIds(stateNamesOf(CANVAS_STATE));
        await graphTaskHost.sendShowTasks(['web#build']);
      });

      await test.step('THEN the web project reads mixed', async (): Promise<void> =>
        graphTaskProjects.expectCheck('Choose tasks of web', 'mixed'));

      await test.step('WHEN its check is activated', async (): Promise<void> => graphTaskProjects.check('Choose tasks of web'));

      await test.step('THEN it reads checked and both tasks are saved as chosen', async (): Promise<void> => {
        await graphTaskProjects.expectCheck('Choose tasks of web', 'checked');
        await graphTaskHost.expectSavedTask({ chosen: ['web#build', 'web#dev'] });
      });
    }
  );

  test(
    'GIVEN a grouped grid, checking a folder chooses every project in it',
    { annotation: CHECKS },
    async ({ graphHost, graphPage, graphProbe, graphTaskHost, graphTaskProbe, graphTaskProjects }): Promise<void> => {
      await test.step('WHEN the grouped view shows root-lib#build', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(CANVAS_STATE.hash) });
        await graphHost.sendState(CANVAS_STATE);
        await graphProbe.expectNodeIds(stateNamesOf(CANVAS_STATE));
        await graphTaskHost.sendShowTasks(['root-lib#build']);
      });

      await test.step('AND the packages folder is checked', async (): Promise<void> =>
        graphTaskProjects.check('Choose tasks of folder packages'));

      await test.step('THEN root-lib#build, the tasks of core and ui and web#build, which needs ui#build, are drawn', async (): Promise<void> =>
        graphTaskProbe.expectTaskIds(['root-lib#build', 'core#build', 'ui#build', 'web#build']));

      await test.step('AND the packages folder reads checked and the apps folder unchecked', async (): Promise<void> => {
        await graphTaskProjects.expectCheck('Choose tasks of folder packages', 'checked');
        await graphTaskProjects.expectCheck('Choose tasks of folder apps', 'unchecked');
      });
    }
  );

  test(
    'GIVEN 401 tasks drawn with the cap lifted, unchecking a project keeps the cap lifted',
    { annotation: CHECKS },
    async ({ graphHost, graphPage, graphTask, graphTaskHost, graphTaskProbe, graphTaskProjects }): Promise<void> => {
      const state = overCapTasksState();

      await test.step('WHEN the cap-lifted view of root#build opens over the over-cap state', async (): Promise<void> => {
        const savedState = taskSavedState(state.hash, { chosen: [OVER_CAP_ROOT_TASK], capLifted: true });

        await graphPage.open({ savedState });
        await graphHost.sendState(state);
        await graphTaskProbe.expectTaskIds(overCapTaskIds());
      });

      await test.step('AND the leaf project is checked and unchecked', async (): Promise<void> => {
        await graphTaskProjects.check('Choose tasks of leaf');
        await graphTaskProjects.uncheck('Choose tasks of leaf');
      });

      await test.step('THEN every task is still drawn, with no banner, and the cap is saved lifted', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds(overCapTaskIds());
        await graphTask.expectBanner(null);
        await graphTaskHost.expectSavedTask({ capLifted: true, chosen: [OVER_CAP_ROOT_TASK] });
      });
    }
  );

  test(
    'GIVEN a search, the projects with a matching task open and list only those tasks, and clearing the search closes them again',
    { annotation: CHECKS },
    async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskHost, graphTaskProjects }): Promise<void> => {
      await test.step('WHEN lib#build is shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(stateNamesOf(TASK_MODE_STATE_STUB));
        await graphTaskHost.sendShowTasks(['lib#build']);
      });

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
      await test.step('WHEN app#dev, a hidden script, is chosen with the build and lint of app', async (): Promise<void> => {
        const savedState = taskSavedState(STUB_HASH, { chosen: ['app#dev', 'app#build', 'app#lint'] });

        await graphPage.open({ savedState });
        await graphHost.sendState(scriptsTasksState(false));
      });

      await test.step('THEN the app project reads checked from its pool tasks', async (): Promise<void> =>
        graphTaskProjects.expectCheck('Choose tasks of app', 'checked'));

      await test.step('WHEN the app project is unchecked', async (): Promise<void> =>
        graphTaskProjects.uncheck('Choose tasks of app'));

      await test.step('THEN only the hidden script stays chosen and the prompt shows', async (): Promise<void> => {
        await graphTaskHost.expectSavedTask({ chosen: ['app#dev'] });
        await graphTask.expectPrompt();
      });
    }
  );

  test(
    'GIVEN a search that lists only some projects of a folder, checking the folder chooses every task of the folder',
    { annotation: CHECKS },
    async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskHost, graphTaskProjects }): Promise<void> => {
      await test.step('WHEN the grouped view shows lib#build and test is searched', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(STUB_HASH) });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(stateNamesOf(TASK_MODE_STATE_STUB));
        await graphTaskHost.sendShowTasks(['lib#build']);
        await graphTask.search('test');
      });

      await test.step('THEN the packages folder reads mixed', async (): Promise<void> =>
        graphTaskProjects.expectCheck('Choose tasks of folder packages', 'mixed'));

      await test.step('WHEN the packages folder is checked', async (): Promise<void> =>
        graphTaskProjects.check('Choose tasks of folder packages'));

      await test.step('THEN every task of the folder is chosen, the unlisted app tasks too', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ chosen: ['lib#build', 'app#build', 'app#lint', 'lib#test', 'ui#build', 'ui#test'] }));
    }
  );
});
