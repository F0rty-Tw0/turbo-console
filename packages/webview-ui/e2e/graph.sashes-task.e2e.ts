import { OVERLAY_WIDTH_PX } from './common/graph.const.ts';
import { test } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const AC2 = { description: 'U3 AC2', type: 'requirement' };

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

test.describe('FEATURE: graph panel sashes in task mode', () => {
  test(
    'GIVEN the task "…" under the overlaid task Details panel, dragging the panel narrower uncovers it',
    { annotation: AC2 },
    async ({ graphCanvas, graphHost, graphNarrow, graphPage, graphSashes, graphTaskNarrow, graphTaskProbe }): Promise<void> => {
      await test.step('GIVEN a 959px editor opened in task mode with lib#build tapped', async (): Promise<void> => {
        await graphNarrow.setWidth(OVERLAY_WIDTH_PX);
        await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphCanvas.tapNode('lib#build');
      });

      await test.step('AND lib#build is panned half under the panel', async (): Promise<void> => {
        await graphTaskNarrow.panUnderPanel('lib#build');
        await graphSashes.expectTaskEllipsisShown('lib#build', false);
      });

      await test.step('WHEN the task Details sash is dragged 80px right', async (): Promise<void> => graphSashes.drag('details', 80));

      await test.step('THEN the panel is 200px wide', async (): Promise<void> =>
        graphSashes.expectPanelWidth('graph-task-details', 200));

      await test.step('AND the "…" of lib#build shows', async (): Promise<void> =>
        graphSashes.expectTaskEllipsisShown('lib#build', true));
    }
  );
});
