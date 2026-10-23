import { test } from './graph.fixture.ts';
import { TASKS_STATE_STUB } from './test/stubs/graph-tasks.stub.ts';

const SLICE_1 = { description: 'M4-5a slice 1', type: 'requirement' };

test.describe('FEATURE: graph task messages', () => {
  test(
    'GIVEN the graph shown with tasks, the page ignores the runs, a showTasks naming no known task and a malformed message',
    { annotation: SLICE_1 },
    async ({ graphHost, graphPage, graphProbe, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a graph state with tasks is sent', async (): Promise<void> => graphHost.sendState(TASKS_STATE_STUB));

      await test.step('AND the host posts runs', async (): Promise<void> =>
        graphTaskHost.sendRuns({ 'base#build': 'running', 'base#test': 'failed-to-start' }));

      await test.step('AND the host posts showTasks naming only zzz#none', async (): Promise<void> =>
        graphTaskHost.sendShowTasks(['zzz#none']));

      await test.step('AND the host posts a malformed runs', async (): Promise<void> =>
        graphTaskHost.sendRaw({ type: 'runs', runs: 'x' }));

      await test.step('THEN the page still has 7 nodes', async (): Promise<void> => graphProbe.expectNodeCount(7));

      await test.step('AND the layout came from ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND the page logged no errors', (): void => graphPage.expectNoErrors());
    }
  );
});
