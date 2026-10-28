import { test } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { TASK_ROOT_STATE_STUB } from './test/stubs/graph-task-root.stub.ts';

const U3_D7 = { description: 'U3 spec D7', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

const LIB_SET = ['lib#build', 'ui#build', 'app#build', 'lib#test'];

test.describe('FEATURE: task details dependents and the package link (D7)', () => {
  test.describe('GIVEN task mode showing the lib#build set', () => {
    test.beforeEach(async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphProbe.expectNodeIds(PACKAGES);
      await graphTask.enter();
      await graphTaskHost.sendShowTasks(['lib#build']);
      await graphTaskProbe.expectTaskIds(LIB_SET);
    });

    test(
      'WHEN lib#build is tapped THEN its Dependents read app#build and lib#test',
      { annotation: U3_D7 },
      async ({ graphCanvas, graphTaskDetails }): Promise<void> => {
        await test.step('WHEN lib#build is tapped', async (): Promise<void> => graphCanvas.tapNode('lib#build'));

        await test.step('THEN its Dependents read app#build and lib#test', async (): Promise<void> =>
          graphTaskDetails.expectDependents(['app#build', 'lib#test']));
      }
    );

    test(
      'WHEN app#build is tapped THEN its Dependents read None shown',
      { annotation: U3_D7 },
      async ({ graphCanvas, graphTaskDetails }): Promise<void> => {
        await test.step('WHEN app#build is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

        await test.step('THEN its Dependents read None shown', async (): Promise<void> => graphTaskDetails.expectDependents([]));
      }
    );

    test(
      'WHEN the owner link of lib#build is clicked THEN the graph leaves task mode and reveals package lib',
      { annotation: U3_D7 },
      async ({ graphCanvas, graphProbe, graphReveal, graphTask, graphTaskDetails }): Promise<void> => {
        await test.step('WHEN lib#build is tapped', async (): Promise<void> => graphCanvas.tapNode('lib#build'));

        await test.step('AND its owner link is clicked', async (): Promise<void> => graphTaskDetails.clickOwner('lib'));

        await test.step('THEN the package graph shows with lib selected and placed in view', async (): Promise<void> => {
          await graphTask.expectPressed(false);
          await graphProbe.expectNodeIds(PACKAGES);
          await graphProbe.expectSelected('lib');
          await graphReveal.expectPlaced('lib');
        });
      }
    );
  });

  test(
    'GIVEN task mode showing the root task //#lint WHEN it is tapped THEN the panel has no owner link',
    { annotation: U3_D7 },
    async ({ graphCanvas, graphHost, graphPage, graphTask, graphTaskDetails, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('GIVEN task mode showing //#lint', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_ROOT_STATE_STUB);
        await graphTask.enter();
        await graphTaskHost.sendShowTasks(['//#lint']);
        await graphTaskProbe.expectTaskIds(['//#lint']);
      });

      await test.step('WHEN //#lint is tapped', async (): Promise<void> => graphCanvas.tapNode('//#lint'));

      await test.step('THEN the panel reads lint with no owner link', async (): Promise<void> => {
        await graphTaskDetails.expectTask('lint', 'eslint .');
        await graphTaskDetails.expectNoOwnerLink();
      });
    }
  );
});
