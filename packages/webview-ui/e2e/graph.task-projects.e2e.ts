import { test } from './graph-task-projects.fixture.ts';
import { stateNamesOf } from './test/utils/graph-package.spec.util.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { taskCanvasState } from './test/utils/graph-task-canvas.spec.util.ts';
import { APP_TASK_NAME, ROOT_TASK_NAME, taskRootState } from './test/utils/graph-task-root.spec.util.ts';

const PROJECTS = { description: 'U5 spec D13 (Projects), §5 rows 16 and 23', type: 'requirement' };

const CANVAS_STATE = taskCanvasState();

const BOTH_TASKS = [`//#${ROOT_TASK_NAME}`, `@org/app#${APP_TASK_NAME}`];

/** Folders and collapsed projects of the canvas state, grouped: the root folder first, then by code unit. */
const GROUPED_LINES = ['(root)', 'Workspace root (//) (1)', 'root-lib (1)', 'apps', 'web (2)', 'packages', 'core (1)', 'ui (1)'];

const BEFORE_WEB_TASKS = GROUPED_LINES.slice(0, 5);

const AFTER_WEB_TASKS = GROUPED_LINES.slice(5);

/** `GROUPED_LINES` with web's two tasks after `web (2)`. */
const WEB_OPEN_LINES = [...BEFORE_WEB_TASKS, 'web#build', 'web#dev', ...AFTER_WEB_TASKS];

const GROUP_CHECKS = [
  'Choose tasks of folder (root)',
  'Choose tasks of folder apps',
  'Choose tasks of folder packages',
  'Choose tasks of Workspace root (//)',
  'Choose tasks of root-lib',
  'Choose tasks of web',
  'Choose tasks of core',
  'Choose tasks of ui'
];

test.describe('FEATURE: the task Controls Projects grid', () => {
  test(
    'GIVEN a grouped saved view over five packages in three folders with every task chosen, the Projects grid lists folder headers and collapsed projects in order',
    { annotation: PROJECTS },
    async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskProjects, graphTaskView }): Promise<void> => {
      await test.step('WHEN the grouped saved view opens in task mode and every task is chosen', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(CANVAS_STATE.hash) });
        await graphHost.sendState(CANVAS_STATE);
        await graphProbe.expectNodeIds(stateNamesOf(CANVAS_STATE));
        await graphTask.enter();
        await graphTask.clickShowEvery();
      });

      await test.step('THEN the sections read Search, View then Projects', async (): Promise<void> =>
        graphTaskView.expectSectionTitles(['Search', 'View', 'Projects']));

      await test.step('AND the grid lists the folders and the collapsed projects in order', async (): Promise<void> =>
        graphTaskProjects.expectLines(GROUPED_LINES));

      await test.step('AND every folder and project check reads checked', async (): Promise<void> =>
        graphTaskProjects.expectChecks(GROUP_CHECKS, 'checked'));
    }
  );

  test(
    'GIVEN the grid, web expanded lists its two tasks and collapsing removes them, with aria-expanded following',
    { annotation: PROJECTS },
    async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskProjects }): Promise<void> => {
      await test.step('WHEN the grouped saved view opens in task mode with every task chosen and web is expanded', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(CANVAS_STATE.hash) });
        await graphHost.sendState(CANVAS_STATE);
        await graphProbe.expectNodeIds(stateNamesOf(CANVAS_STATE));
        await graphTask.enter();
        await graphTask.clickShowEvery();
        await graphTaskProjects.expand('web (2)');
      });

      await test.step('THEN its two tasks follow it and it reads expanded', async (): Promise<void> => {
        await graphTaskProjects.expectLines(WEB_OPEN_LINES);
        await graphTaskProjects.expectOpen('web (2)', true);
      });

      await test.step('WHEN web is collapsed', async (): Promise<void> => graphTaskProjects.collapse('web (2)'));

      await test.step('THEN its tasks are gone and it reads collapsed', async (): Promise<void> => {
        await graphTaskProjects.expectLines(GROUPED_LINES);
        await graphTaskProjects.expectOpen('web (2)', false);
      });
    }
  );

  test(
    'GIVEN only web#build chosen, the web project reads mixed, web#dev is dimmed, and picking a drawn task name selects it',
    { annotation: PROJECTS },
    async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskDetails, graphTaskHost, graphTaskProjects }): Promise<void> => {
      await test.step('WHEN the grouped saved view opens in task mode and only web#build is chosen', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(CANVAS_STATE.hash) });
        await graphHost.sendState(CANVAS_STATE);
        await graphProbe.expectNodeIds(stateNamesOf(CANVAS_STATE));
        await graphTask.enter();
        await graphTaskHost.sendShowTasks(['web#build']);
        await graphTaskProjects.expand('web (2)');
      });

      await test.step('THEN the web project is mixed, web#build checked and web#dev unchecked', async (): Promise<void> => {
        await graphTaskProjects.expectCheck('Choose tasks of web', 'mixed');
        await graphTaskProjects.expectCheck('Choose web#build', 'checked');
        await graphTaskProjects.expectCheck('Choose web#dev', 'unchecked');
      });

      await test.step('WHEN the undrawn web#dev name is pressed', async (): Promise<void> => graphTaskProjects.pick('web#dev'));

      await test.step('THEN no task is selected', async (): Promise<void> => graphTaskDetails.expectEmpty());

      await test.step('WHEN the drawn web#build name is pressed', async (): Promise<void> => graphTaskProjects.pick('web#build'));

      await test.step('THEN web#build is selected', async (): Promise<void> => graphTaskDetails.expectTask('build', 'build'));
    }
  );

  test(
    'GIVEN scopes shown, unticking Show package scopes relabels the project rows',
    { annotation: PROJECTS },
    async ({ graphControls, graphHost, graphPage, graphProbe, graphTaskHost, graphTaskProjects }): Promise<void> => {
      await test.step('WHEN the root // and @org/app are drawn in task mode with scopes shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(taskRootState(true));
        await graphProbe.expectNodeIds(['@org/app']);
        await graphTaskHost.sendShowTasks(BOTH_TASKS);
      });

      await test.step('THEN the projects read the root and the scoped name', async (): Promise<void> =>
        graphTaskProjects.expectLines(['Workspace root (//) (1)', '@org/app (1)']));

      await test.step('WHEN Show package scopes is unticked and the host answers with the bare names', async (): Promise<void> => {
        await graphControls.scope.uncheck();
        await graphHost.sendState(taskRootState(false));
      });

      await test.step('THEN the project reads the bare name and its check is named for it', async (): Promise<void> => {
        await graphTaskProjects.expectLines(['Workspace root (//) (1)', 'app (1)']);
        await graphTaskProjects.expectCheck('Choose tasks of app', 'checked');
      });
    }
  );
});
