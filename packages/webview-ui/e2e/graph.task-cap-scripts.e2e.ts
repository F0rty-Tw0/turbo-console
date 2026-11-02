import { test } from './graph-task.fixture.ts';
import { SCRIPT_CAP_ROOT_TASK, scriptCapState } from './test/utils/graph-scripts.spec.util.ts';
import type { GraphTask } from '../src/bridge/common/graph-state.type.ts';

const CAP_SCRIPTS = { description: 'U5d spec D9', type: 'requirement' };

const isTurbo = (task: GraphTask): boolean => task.isTurboTask;

const idOf = (task: GraphTask): string => task.id;

/** The chosen task and its 294 turbo dependents. */
const TURBO_IDS = scriptCapState(false).tasks.filter(isTurbo).map(idOf);

/** The 305-task pool less the chosen task: the whole dependent hop-1 level that the cap cuts. */
const CUT_COUNT = 304;

test.describe('FEATURE: graph task mode cap counts the pool', () => {
  test.beforeEach(async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
    await test.step('GIVEN root#build with 294 turbo and 10 script dependents, scripts hidden', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(scriptCapState(false));
      await graphProbe.expectNodeIds(['leaf', 'root']);
    });
  });

  test(
    'GIVEN scripts hidden, naming root#build draws its 295 turbo tasks with no banner',
    { annotation: CAP_SCRIPTS },
    async ({ graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN showTasks names root#build', async (): Promise<void> =>
        graphTaskHost.sendShowTasks([SCRIPT_CAP_ROOT_TASK]));

      await test.step('THEN 295 tasks are drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(TURBO_IDS));

      await test.step('AND no banner shows', async (): Promise<void> => graphTask.expectBanner(null));

      await test.step('AND the slow line is hidden', async (): Promise<void> => graphTask.expectSlowHidden());
    }
  );

  test(
    'GIVEN scripts hidden and root#build drawn, the same hash with scripts shown cuts the dependent level and the banner counts 304',
    { annotation: CAP_SCRIPTS },
    async ({ graphHost, graphTask, graphTaskHost }): Promise<void> => {
      await test.step('WHEN showTasks names root#build', async (): Promise<void> =>
        graphTaskHost.sendShowTasks([SCRIPT_CAP_ROOT_TASK]));

      await test.step('AND a state of the same hash with scripts shown arrives', async (): Promise<void> =>
        graphHost.sendState(scriptCapState(true)));

      await test.step('THEN the banner counts the 304 tasks the cap cut', async (): Promise<void> =>
        graphTask.expectBanner(CUT_COUNT));
    }
  );
});
