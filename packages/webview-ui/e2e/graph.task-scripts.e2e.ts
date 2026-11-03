import { test } from './graph-task-boxes.fixture.ts';
import { scriptsTasksState } from './test/utils/graph-scripts.spec.util.ts';

const SCRIPTS_BOXES = { description: 'U5 spec D10, §5 row 21 (U5e part)', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

const EVERY_TASK = ['app#build', 'app#dev', 'app#lint', 'lib#build', 'lib#start', 'lib#test', 'ui#build', 'ui#test'];

const TURBO_TASKS = ['app#build', 'app#lint', 'lib#build', 'lib#test', 'ui#build', 'ui#test'];

const APP_SCRIPTS: [string, string] = ['scripts:app', 'Scripts'];

const LIB_SCRIPTS: [string, string] = ['scripts:lib', 'Scripts'];

test.describe('FEATURE: graph task mode draws a Scripts box per package', () => {
  test.beforeEach(async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
    await test.step('GIVEN the package graph of the task stub plus the scripts app#dev and lib#start, scripts shown', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(scriptsTasksState(true));
      await graphProbe.expectNodeIds(PACKAGES);
    });
  });

  test(
    'GIVEN scripts shown and every task chosen, each script sits in a Scripts box inside its package box',
    { annotation: SCRIPTS_BOXES },
    async ({ graphTask, graphTaskProbe, graphTaskBoxes }): Promise<void> => {
      await test.step('WHEN Tasks is pressed and every task is chosen', async (): Promise<void> => {
        await graphTask.enter();
        await graphTask.clickShowEvery();
      });

      await test.step('THEN every task is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(EVERY_TASK));

      await test.step('AND there is one Scripts box per package with a script, titled Scripts', async (): Promise<void> =>
        graphTaskBoxes.expectScriptsBoxes([APP_SCRIPTS, LIB_SCRIPTS]));

      await test.step('AND the script is in its Scripts box, which is in the package box', async (): Promise<void> => {
        await graphTaskBoxes.expectNested('app#dev', 'scripts:app');
        await graphTaskBoxes.expectNested('scripts:app', 'pkg:app');
      });

      await test.step('AND the turbo task is in the package box, outside the Scripts box', async (): Promise<void> => {
        await graphTaskBoxes.expectNested('app#build', 'pkg:app');
        await graphTaskBoxes.expectNotNested('app#build', 'scripts:app');
      });

      await test.step('AND the Scripts title is not cut', async (): Promise<void> =>
        graphTaskBoxes.expectTitlesUncut(['scripts:app']));
    }
  );

  test(
    'GIVEN every task drawn with scripts shown, a same-hash state with scripts hidden drops the Scripts boxes',
    { annotation: SCRIPTS_BOXES },
    async ({ graphHost, graphTask, graphTaskProbe, graphTaskBoxes }): Promise<void> => {
      await test.step('WHEN Tasks is pressed and every task is chosen', async (): Promise<void> => {
        await graphTask.enter();
        await graphTask.clickShowEvery();
        await graphTaskProbe.expectTaskIds(EVERY_TASK);
      });

      await test.step('AND a state of the same hash with scripts hidden arrives', async (): Promise<void> =>
        graphHost.sendState(scriptsTasksState(false)));

      await test.step('THEN only the turbo tasks are drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(TURBO_TASKS));

      await test.step('AND no Scripts box is drawn', async (): Promise<void> => graphTaskBoxes.expectScriptsBoxes([]));
    }
  );

  test(
    'GIVEN scripts shown and only the script app#dev chosen, the app package box holds just its Scripts box',
    { annotation: SCRIPTS_BOXES },
    async ({ graphTaskHost, graphTaskProbe, graphTaskBoxes }): Promise<void> => {
      await test.step('WHEN showTasks names app#dev', async (): Promise<void> => graphTaskHost.sendShowTasks(['app#dev']));

      await test.step('THEN only app#dev is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(['app#dev']));

      await test.step('AND its Scripts box is the one box drawn in the app package box', async (): Promise<void> => {
        await graphTaskBoxes.expectScriptsBoxes([APP_SCRIPTS]);
        await graphTaskBoxes.expectNested('app#dev', 'scripts:app');
        await graphTaskBoxes.expectNested('scripts:app', 'pkg:app');
      });
    }
  );
});
