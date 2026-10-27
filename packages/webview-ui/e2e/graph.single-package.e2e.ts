import { expect, test } from './graph-task.fixture.ts';
import { SINGLE_PACKAGE_TASKS_STUB } from './test/stubs/graph-single-package.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { groupedSavedState } from './test/utils/graph-saved-state.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const SINGLE = { description: '2026-10-27-ub3-single-package-task-graph AC1-AC5', type: 'requirement' };

const ALL_IDS = ['//#build', '//#lint', '//#test:unit'];

const { hash } = SINGLE_PACKAGE_TASKS_STUB;

test.describe('FEATURE: the task graph of a single-package repo', () => {
  test(
    'GIVEN a single-package state, the page opens in task mode on every task with no mode buttons',
    { annotation: SINGLE },
    async ({ graphHost, graphPage, graphSinglePackage, graphTask, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page is opened and the state is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(SINGLE_PACKAGE_TASKS_STUB);
      });

      await test.step('THEN task mode is on and every task is drawn', async (): Promise<void> => {
        await graphSinglePackage.expectTaskMode();
        await graphTaskProbe.expectTaskIds(ALL_IDS);
        await graphTask.expectPrompt(false);
      });

      await test.step('AND the Packages and Tasks buttons and their separator are hidden', async (): Promise<void> =>
        graphSinglePackage.expectModesHidden());

      await test.step('AND every task row describes single-app', async (): Promise<void> =>
        graphSinglePackage.expectRowPackagesRead('single-app'));

      await test.step('AND the box is titled single-app', async (): Promise<void> =>
        graphTaskProbe.expectBoxTitlesDrawn(['single-app']));
    }
  );

  test(
    'GIVEN the same state sent again, the page stays in task mode and posts nothing',
    { annotation: SINGLE },
    async ({ graphHost, graphPage, graphSinglePackage, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page is opened and the state is sent twice', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(SINGLE_PACKAGE_TASKS_STUB);
        await graphTaskProbe.expectTaskIds(ALL_IDS);
        await graphHost.sendState(SINGLE_PACKAGE_TASKS_STUB);
      });

      await test.step('THEN task mode is still on', async (): Promise<void> => graphSinglePackage.expectTaskMode());

      await test.step('AND the page posted only ready', async (): Promise<void> => graphHost.expectPosted([{ type: 'ready' }]));
    }
  );

  test(
    'GIVEN a monorepo state, the mode buttons stay visible',
    { annotation: SINGLE },
    async ({ graphHost, graphPage, graphTask }): Promise<void> => {
      await test.step('WHEN the page is opened and the monorepo state is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
      });

      await test.step('THEN Packages and Tasks are shown', async (): Promise<void> => {
        await expect(graphTask.packagesButton).toBeVisible();
        await expect(graphTask.tasksButton).toBeVisible();
      });
    }
  );

  test(
    'GIVEN a saved panel in packages mode, a single-package state still opens task mode',
    { annotation: SINGLE },
    async ({ graphHost, graphPage, graphSinglePackage, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN a panel saved in packages mode is opened and the state is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: groupedSavedState(hash) });
        await graphHost.sendState(SINGLE_PACKAGE_TASKS_STUB);
      });

      await test.step('THEN task mode is on and every task is drawn', async (): Promise<void> => {
        await graphSinglePackage.expectTaskMode();
        await graphTaskProbe.expectTaskIds(ALL_IDS);
      });
    }
  );

  test(
    'GIVEN a saved choice of one task, only that task and its chain are drawn',
    { annotation: SINGLE },
    async ({ graphHost, graphPage, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN a panel that chose //#lint is opened and the state is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState(hash, { chosen: ['//#lint'] }) });
        await graphHost.sendState(SINGLE_PACKAGE_TASKS_STUB);
      });

      await test.step('THEN only //#lint is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(['//#lint']));
    }
  );

  test(
    'GIVEN saved chosen ids that no longer exist, every task is drawn',
    { annotation: SINGLE },
    async ({ graphHost, graphPage, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN a panel that chose //#gone is opened and the state is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState(hash, { chosen: ['//#gone'] }) });
        await graphHost.sendState(SINGLE_PACKAGE_TASKS_STUB);
      });

      await test.step('THEN every task is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(ALL_IDS));
    }
  );
});
