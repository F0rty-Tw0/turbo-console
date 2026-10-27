import type { FocusStep } from './common/graph.type.ts';
import { expect, test } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { tabStopsOf } from './test/utils/graph-focus-steps.spec.util.ts';
import { UNKNOWN_TASKS_TEXT } from '../src/graph/common/graph-task.const.ts';

const U3_T1 = { description: 'U3 spec D1, T1', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

test.describe('FEATURE: graph Packages and Tasks mode control', () => {
  test.beforeEach(async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
    await test.step('GIVEN the package graph of the task stub, laid out by ELK', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphProbe.expectNodeIds(PACKAGES);
    });
  });

  test(
    'GIVEN the package graph, Packages and Tasks are both shown and Tab stops, Packages pressed and Tasks not',
    { annotation: U3_T1 },
    async ({ graphKeys, graphTask, graphToolbar }): Promise<void> => {
      await test.step('THEN both buttons are visible', async (): Promise<void> => {
        await expect(graphTask.packagesButton).toBeVisible();
        await expect(graphTask.tasksButton).toBeVisible();
      });

      await test.step('AND they draw the type-hierarchy and tasklist icons', async (): Promise<void> => {
        await graphToolbar.expectIcon('Packages', 'type-hierarchy');
        await graphToolbar.expectIcon('Tasks', 'tasklist');
      });

      await test.step('AND Packages is pressed and Tasks is not', async (): Promise<void> => graphTask.expectPressed(false));

      const walked = await test.step('WHEN Tab is pressed twice', async (): Promise<FocusStep[]> =>
        graphKeys.walk(tabStopsOf(['Packages', 'Tasks'])));

      await test.step('THEN both are Tab stops, in order', (): void => expect(walked).toEqual(tabStopsOf(['Packages', 'Tasks'])));
    }
  );

  test(
    'GIVEN the package graph, a click on Packages is ignored',
    { annotation: U3_T1 },
    async ({ graphHost, graphProbe, graphTask }): Promise<void> => {
      await test.step('WHEN Packages is clicked', async (): Promise<void> => graphTask.leave());

      await test.step('THEN Packages is still pressed and the nodes are unchanged', async (): Promise<void> => {
        await graphTask.expectPressed(false);
        await graphProbe.expectNodeIds(PACKAGES);
      });

      await test.step('AND no second layout ran', async (): Promise<void> => graphHost.expectLayoutDones(['elk']));
    }
  );

  test(
    'GIVEN task mode with a notice showing, a click on Tasks turns it on once and a second click is ignored',
    { annotation: U3_T1 },
    async ({ graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN Tasks is clicked', async (): Promise<void> => graphTask.enter());

      await test.step('THEN task mode is on, Tasks is pressed and has focus', async (): Promise<void> => {
        await graphTask.expectPressed(true);
        await expect(graphTask.tasksButton).toBeFocused();
      });

      await test.step('WHEN the chain is chosen and then an unknown task is named', async (): Promise<void> => {
        await graphTaskHost.sendShowTasks(['app#build']);
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphTaskHost.sendShowTasks(['zzz#none']);
        await graphTask.expectNotice(UNKNOWN_TASKS_TEXT);
      });

      await test.step('AND Tasks is clicked again', async (): Promise<void> => graphTask.enter());

      await test.step('THEN the page is untouched: the notice and the chain stay and Tasks is still pressed', async (): Promise<void> => {
        await graphTask.expectNotice(UNKNOWN_TASKS_TEXT);
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphTask.expectPressed(true);
      });
    }
  );

  test(
    'GIVEN task mode, a click on Packages leaves it and Packages has focus once the graph shows',
    { annotation: U3_T1 },
    async ({ graphProbe, graphTask, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the chain is chosen and Packages is clicked', async (): Promise<void> => {
        await graphTaskHost.sendShowTasks(['app#build']);
        await graphTask.expectPressed(true);
        await graphTask.leave();
      });

      await test.step('THEN the package nodes are drawn and Packages is pressed', async (): Promise<void> => {
        await graphProbe.expectNodeIds(PACKAGES);
        await graphTask.expectPressed(false);
      });

      await test.step('AND Packages has focus', async (): Promise<void> => expect(graphTask.packagesButton).toBeFocused());
    }
  );

  test(
    'GIVEN task mode, the host showPackage leaves it with Packages pressed',
    { annotation: U3_T1 },
    async ({ graphTask, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the chain is chosen and the host posts showPackage for app', async (): Promise<void> => {
        await graphTaskHost.sendShowTasks(['app#build']);
        await graphTask.expectPressed(true);
        await graphTaskHost.sendShowPackage('app');
      });

      await test.step('THEN Packages is pressed and Tasks is not', async (): Promise<void> => graphTask.expectPressed(false));
    }
  );

  test(
    'GIVEN each mode button focused, Enter and Space act as a click',
    { annotation: U3_T1 },
    async ({ graphKeys, graphTask }): Promise<void> => {
      await test.step('WHEN Tasks has focus and Enter is pressed', async (): Promise<void> => {
        await graphTask.tasksButton.focus();
        await graphKeys.press('Enter');
      });

      await test.step('THEN task mode is on', async (): Promise<void> => graphTask.expectPressed(true));

      await test.step('WHEN Packages has focus and Space is pressed', async (): Promise<void> => {
        await graphTask.packagesButton.focus();
        await graphKeys.press('Space');
      });

      await test.step('THEN the package graph shows', async (): Promise<void> => graphTask.expectPressed(false));

      await test.step('WHEN Tasks has focus and Space is pressed', async (): Promise<void> => {
        await graphTask.tasksButton.focus();
        await graphKeys.press('Space');
      });

      await test.step('THEN task mode is on again', async (): Promise<void> => graphTask.expectPressed(true));

      await test.step('WHEN Packages has focus and Enter is pressed', async (): Promise<void> => {
        await graphTask.packagesButton.focus();
        await graphKeys.press('Enter');
      });

      await test.step('THEN the package graph shows again', async (): Promise<void> => graphTask.expectPressed(false));
    }
  );
});
