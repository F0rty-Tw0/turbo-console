import { OVERLAY_WIDTH_PX } from './common/graph.const.ts';
import { test } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const KEEP_CLEAR = { description: 'M4-5a slice 2 proof 3a', type: 'requirement' };

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

test.describe('FEATURE: the task "…" beside the overlaid task details panel', () => {
  test(
    'GIVEN a narrow editor and lib#build half under the task details panel, tapping it pans it and its "…" clear, and the "…" and its menu take clicks',
    { annotation: KEEP_CLEAR },
    async ({ graphCanvas, graphHost, graphNarrow, graphPage, graphTask, graphTaskNarrow, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the editor is narrowed to 959 px and opens cold in task mode with app#build chosen', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphTaskProbe.expectTaskIds(CHAIN);
      });

      await test.step('AND lib#build is panned half under the task details panel and tapped', async (): Promise<void> => {
        await graphTaskNarrow.panUnderPanel('lib#build');
        await graphCanvas.tapNode('lib#build');
      });

      await test.step('THEN a click on its "…" lands on the "…"', async (): Promise<void> =>
        graphTaskNarrow.expectMenuButtonOnTop('lib#build'));

      await test.step('WHEN its "…" is pressed', async (): Promise<void> => graphTask.menu('lib#build'));

      await test.step('THEN a click on each menu item lands on the item', async (): Promise<void> =>
        graphTaskNarrow.expectMenuItemsOnTop());
    }
  );

  test(
    'GIVEN lib#build selected near the right edge of a wide editor, narrowing it pans lib#build and its "…" clear of the panel, and the "…" takes clicks',
    { annotation: KEEP_CLEAR },
    async ({ graphCanvas, graphHost, graphNarrow, graphPage, graphTaskNarrow, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens cold in task mode with app#build chosen', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphTaskProbe.expectTaskIds(CHAIN);
      });

      await test.step("AND lib#build is panned near the canvas's right edge and tapped", async (): Promise<void> => {
        await graphTaskNarrow.panNearCanvasRight('lib#build');
        await graphCanvas.tapNode('lib#build');
      });

      await test.step('AND the editor is narrowed to 959 px', async (): Promise<void> => graphNarrow.setWidth(OVERLAY_WIDTH_PX));

      await test.step('THEN a click on its "…" lands on the "…"', async (): Promise<void> =>
        graphTaskNarrow.expectMenuButtonOnTop('lib#build'));
    }
  );
});
