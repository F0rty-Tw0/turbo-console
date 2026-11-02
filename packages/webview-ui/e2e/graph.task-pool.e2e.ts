import { test } from './graph-task.fixture.ts';
import { scriptsTasksState } from './test/utils/graph-scripts.spec.util.ts';

const POOL = { description: 'U5d spec D8', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

test.describe('FEATURE: graph task mode draws the pool', () => {
  test.beforeEach(async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
    await test.step('GIVEN the package graph of the task stub plus two package scripts, scripts hidden', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(scriptsTasksState(false));
      await graphProbe.expectNodeIds(PACKAGES);
    });
  });

  test(
    'GIVEN scripts hidden, showTasks naming app#build and the script app#dev draws the chain and no script',
    { annotation: POOL },
    async ({ graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN showTasks names app#build and app#dev', async (): Promise<void> =>
        graphTaskHost.sendShowTasks(['app#build', 'app#dev']));

      await test.step('THEN only the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));
    }
  );

  test(
    'GIVEN scripts hidden and a hidden script named, task mode says nothing is unknown and offers the prompt',
    { annotation: POOL },
    async ({ graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN showTasks names app#dev', async (): Promise<void> => graphTaskHost.sendShowTasks(['app#dev']));

      await test.step('THEN task mode is on with the prompt and nothing drawn', async (): Promise<void> => {
        await graphTask.expectPressed(true);
        await graphTask.expectPrompt();
        await graphTaskProbe.expectTaskIds([]);
      });

      await test.step('AND no notice says the task is unknown', async (): Promise<void> => graphTask.expectNotice(null));
    }
  );

  test(
    'GIVEN scripts hidden, the same hash with scripts shown draws a named script and grows Show every task',
    { annotation: POOL },
    async ({ graphHost, graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN Tasks is pressed', async (): Promise<void> => graphTask.enter());

      await test.step('THEN Show every task counts the 6 turbo tasks', async (): Promise<void> =>
        graphTask.expectShowEvery('Show every task (6)'));

      await test.step('WHEN a state of the same hash with scripts shown arrives', async (): Promise<void> =>
        graphHost.sendState(scriptsTasksState(true)));

      await test.step('THEN Show every task counts 8', async (): Promise<void> => graphTask.expectShowEvery('Show every task (8)'));

      await test.step('WHEN showTasks names app#dev', async (): Promise<void> => graphTaskHost.sendShowTasks(['app#dev']));

      await test.step('THEN app#dev is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(['app#dev']));
    }
  );
});
