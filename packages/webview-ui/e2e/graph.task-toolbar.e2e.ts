import { test } from './graph-toolbar.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const D6 = { description: 'U4 D6', type: 'requirement' };

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

test.describe("FEATURE: the selected task's node toolbar", () => {
  test.beforeEach(async ({ graphHost, graphPage, graphTaskProbe }): Promise<void> => {
    await test.step('GIVEN a cold open in task mode with app#build chosen', async (): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphTaskProbe.expectTaskIds(CHAIN);
    });
  });

  test(
    'GIVEN app#build tapped, its toolbar sits above it with the "…" and opens the task menu from the "…"',
    { annotation: D6 },
    async ({ graphCanvas, graphMenus, graphTask, graphTaskToolbar }): Promise<void> => {
      await test.step('WHEN app#build is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

      await test.step('THEN its toolbar is above app#build', async (): Promise<void> =>
        graphTaskToolbar.expectNodeToolbarOn('app#build', 'above'));

      await test.step('AND it holds only the "…"', async (): Promise<void> =>
        graphTaskToolbar.expectToolbarButtons('app#build', ['Actions for app#build']));

      await test.step('WHEN the "…" is pressed', async (): Promise<void> => graphTask.menu('app#build'));

      await test.step('THEN the menu offers Run and Run without cache', async (): Promise<void> =>
        graphMenus.expectItems(['Run', 'Run without cache']));

      await test.step('AND it opened on the "…"', async (): Promise<void> => graphTaskToolbar.expectMenuOnEllipsis('app#build'));
    }
  );

  test(
    'GIVEN app#build tapped, tapping lib#build moves the one toolbar there',
    { annotation: D6 },
    async ({ graphCanvas, graphTaskToolbar }): Promise<void> => {
      await test.step('WHEN app#build is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

      await test.step('AND lib#build is tapped', async (): Promise<void> => graphCanvas.tapNode('lib#build'));

      await test.step('THEN the one task toolbar sits above lib#build', async (): Promise<void> =>
        graphTaskToolbar.expectNodeToolbarOn('lib#build', 'above'));
    }
  );
});
