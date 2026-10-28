import { test } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';

const D8 = { description: 'U3 spec D8, T4', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

test.describe('FEATURE: graph location bar, package mode', () => {
  test(
    'GIVEN the page opening, the bar waits for the graph and then shows only Packages, as the current crumb',
    { annotation: D8 },
    async ({ graphHost, graphLocation, graphPage }): Promise<void> => {
      await test.step('WHEN the page opens with no state yet', async (): Promise<void> => graphPage.open());

      await test.step('THEN the bar is hidden', async (): Promise<void> => graphLocation.expectHidden());

      await test.step('WHEN the state arrives', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('THEN the bar shows Packages as the current crumb, with no lines', async (): Promise<void> => {
        await graphLocation.expectCrumbs(['Packages'], 'Packages');
        await graphLocation.expectLines([]);
      });
    }
  );
});

test.describe('FEATURE: graph location bar, task mode', () => {
  test.beforeEach(async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
    await test.step('GIVEN the package graph of the task stub, laid out by ELK', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphProbe.expectNodeIds(PACKAGES);
    });
  });

  test(
    'GIVEN two app tasks chosen, the bar shows Packages › app › Tasks (4), counting the drawn chain',
    { annotation: D8 },
    async ({ graphLocation, graphTaskHost }): Promise<void> => {
      await test.step('WHEN showTasks names app#build and app#lint', async (): Promise<void> =>
        graphTaskHost.sendShowTasks(['app#build', 'app#lint']));

      await test.step('THEN the crumbs are Packages, app, then Tasks (4) as the current one', async (): Promise<void> =>
        graphLocation.expectCrumbs(['Packages', 'app', 'Tasks (4)'], 'Tasks (4)'));
    }
  );

  test(
    'GIVEN tasks of two packages chosen, the bar shows Packages › Tasks (4) with no package crumb',
    { annotation: D8 },
    async ({ graphLocation, graphTaskHost }): Promise<void> => {
      await test.step('WHEN showTasks names app#build and lib#build', async (): Promise<void> =>
        graphTaskHost.sendShowTasks(['app#build', 'lib#build']));

      await test.step('THEN the crumbs are Packages, then Tasks (4) as the current one', async (): Promise<void> =>
        graphLocation.expectCrumbs(['Packages', 'Tasks (4)'], 'Tasks (4)'));
    }
  );

  test(
    'GIVEN app#build shown, the Packages crumb returns to package mode',
    { annotation: D8 },
    async ({ graphLocation, graphTask, graphTaskHost }): Promise<void> => {
      await test.step('WHEN showTasks names app#build', async (): Promise<void> => graphTaskHost.sendShowTasks(['app#build']));

      await test.step('THEN the bar shows Packages › app › Tasks (3)', async (): Promise<void> =>
        graphLocation.expectCrumbs(['Packages', 'app', 'Tasks (3)'], 'Tasks (3)'));

      await test.step('WHEN the Packages crumb is pressed', async (): Promise<void> => graphLocation.press('Packages'));

      await test.step('THEN task mode is off and the bar shows only Packages', async (): Promise<void> => {
        await graphTask.expectPressed(false);
        await graphLocation.expectCrumbs(['Packages'], 'Packages');
      });
    }
  );

  test(
    'GIVEN app#build shown, the app crumb reveals app in the package graph',
    { annotation: D8 },
    async ({ graphLocation, graphReveal, graphTask, graphTaskHost }): Promise<void> => {
      await test.step('WHEN showTasks names app#build', async (): Promise<void> => graphTaskHost.sendShowTasks(['app#build']));

      await test.step('AND the app crumb is pressed', async (): Promise<void> => graphLocation.press('app'));

      await test.step('THEN task mode is off and app sits inside the canvas, clear of the details panel', async (): Promise<void> => {
        await graphTask.expectPressed(false);
        await graphReveal.expectPlaced('app');
      });
    }
  );
});
