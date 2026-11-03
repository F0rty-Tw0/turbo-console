import { expect, test } from './graph-task.fixture.ts';
import { APP_TASK_NAME, ROOT_TASK_NAME, taskRootState } from './test/utils/graph-task-root.spec.util.ts';
import { ROOT_TASKS_TITLE } from '../src/graph/common/graph-task.const.ts';

const ROOT_TITLE = { description: 'U5 spec D7, D12, §5 row 15', type: 'requirement' };

const STATE = taskRootState(true);

const ROOT_TASK = `//#${ROOT_TASK_NAME}`;

const BOTH_TASKS = [ROOT_TASK, `@org/app#${APP_TASK_NAME}`];

test.describe('FEATURE: task mode titles the workspace root', () => {
  test.beforeEach(async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
    await test.step('GIVEN a monorepo whose root // is listed by its task only', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(STATE);
      await graphProbe.expectNodeIds(['@org/app']);
    });
  });

  test(
    'GIVEN a root task chosen with others, the // box reads Workspace root (//) and its title is whole',
    { annotation: ROOT_TITLE },
    async ({ graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN showTasks names the root task and the app task', async (): Promise<void> => {
        await graphTaskHost.sendShowTasks(BOTH_TASKS);
        await graphTaskProbe.expectTaskIds(BOTH_TASKS);
      });

      await test.step('THEN the boxes read Workspace root (//) and @org/app', async (): Promise<void> =>
        graphTaskProbe.expectBoxTitlesDrawn([ROOT_TASKS_TITLE, '@org/app']));

      await test.step('AND the root title is drawn whole', async (): Promise<void> =>
        graphTaskProbe.expectBoxTitlesUncut([ROOT_TASKS_TITLE]));
    }
  );

  test(
    'GIVEN the same state sent with scopes hidden, the box titles read Workspace root (//) and app, and app stays whole',
    { annotation: ROOT_TITLE },
    async ({ graphHost, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN both tasks are drawn and a same-hash state flips scopeShown to false', async (): Promise<void> => {
        await graphTaskHost.sendShowTasks(BOTH_TASKS);
        await graphTaskProbe.expectTaskIds(BOTH_TASKS);
        await graphHost.sendState(taskRootState(false));
      });

      await test.step('THEN the boxes read Workspace root (//) and app', async (): Promise<void> => {
        await graphTaskProbe.expectText('pkg://', ROOT_TASKS_TITLE);
        await graphTaskProbe.expectText('pkg:@org/app', 'app');
      });

      await test.step('AND the app box is wide enough for its new title', async (): Promise<void> =>
        graphTaskProbe.expectBoxTitlesUncut(['app']));
    }
  );

  test(
    'GIVEN only the root task chosen, the location bar reads Packages / Workspace root (//) / Tasks (1), the middle crumb not a button',
    { annotation: ROOT_TITLE },
    async ({ graphLocation, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN showTasks names the root task alone', async (): Promise<void> => {
        await graphTaskHost.sendShowTasks([ROOT_TASK]);
        await graphTaskProbe.expectTaskIds([ROOT_TASK]);
      });

      await test.step('THEN the crumbs read Packages, Workspace root (//), then Tasks (1) as the current one', async (): Promise<void> =>
        graphLocation.expectCrumbs(['Packages', ROOT_TASKS_TITLE, 'Tasks (1)'], 'Tasks (1)'));

      await test.step('AND the root crumb is plain text, not a button', async (): Promise<void> =>
        expect(graphLocation.crumb(ROOT_TASKS_TITLE)).toHaveCount(0));
    }
  );
});
