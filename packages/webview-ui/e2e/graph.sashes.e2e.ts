import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { SAVED_BASE_STUB } from './test/stubs/graph-saved.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const AC2 = { description: 'U3 AC2', type: 'requirement' };

const SAVED_WIDTHS = { controls: 320, details: 300 };

const SAVED_PACKAGES = { ...SAVED_BASE_STUB, panelWidths: SAVED_WIDTHS };

const TASK_SAVED = taskSavedState('7a5c0001', { chosen: ['app#build'] });

const SAVED_TASKS = { ...TASK_SAVED, panelWidths: SAVED_WIDTHS };

test.describe('FEATURE: graph panel sashes', () => {
  test(
    'GIVEN the details graph sent, both sashes show at the default widths and point at the package panels',
    { annotation: AC2 },
    async ({ graphHost, graphPage, graphSashes }): Promise<void> => {
      await test.step('WHEN the page is opened and the details graph is sent', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN the Controls sash reads 260 with a 200 minimum', async (): Promise<void> =>
        graphSashes.expectValue('controls', { now: 260, min: 200 }));

      await test.step('AND the Details sash reads 280 with a 200 minimum', async (): Promise<void> =>
        graphSashes.expectValue('details', { now: 280, min: 200 }));

      await test.step('AND the Controls sash controls graph-controls', async (): Promise<void> =>
        graphSashes.expectControls('controls', 'graph-controls'));

      await test.step('AND the Details sash controls graph-details', async (): Promise<void> =>
        graphSashes.expectControls('details', 'graph-details'));
    }
  );

  test(
    'GIVEN the details graph sent, a sash is hidden while its panel is closed',
    { annotation: AC2 },
    async ({ graphControls, graphDetails, graphHost, graphPage, graphSashes }): Promise<void> => {
      await test.step('GIVEN the page opened on the details graph', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('WHEN the Controls panel is closed', async (): Promise<void> => graphControls.toggle());

      await test.step('THEN the Controls sash is hidden', async (): Promise<void> => graphSashes.expectShown('controls', false));

      await test.step('AND the Details sash still shows', async (): Promise<void> => graphSashes.expectShown('details', true));

      await test.step('WHEN the Details panel is closed', async (): Promise<void> => graphDetails.toggle());

      await test.step('THEN the Details sash is hidden', async (): Promise<void> => graphSashes.expectShown('details', false));
    }
  );

  test(
    'GIVEN saved widths of 320 and 300, the package panels are drawn at them on load',
    { annotation: AC2 },
    async ({ graphHost, graphPage, graphSashes }): Promise<void> => {
      await test.step('WHEN the page is opened with the saved widths and the details graph is sent', async (): Promise<void> => {
        await graphPage.open({ savedState: SAVED_PACKAGES });
        await graphHost.sendState(DETAILS_STUB);
      });

      await test.step('THEN the Controls panel is 320px wide', async (): Promise<void> =>
        graphSashes.expectPanelWidth('graph-controls', 320));

      await test.step('AND the Details panel is 300px wide', async (): Promise<void> =>
        graphSashes.expectPanelWidth('graph-details', 300));
    }
  );

  test(
    'GIVEN saved widths in task mode, the task Controls panel gets the width and its sash points at it',
    { annotation: AC2 },
    async ({ graphHost, graphPage, graphSashes }): Promise<void> => {
      await test.step('WHEN the page is opened in task mode with the saved widths', async (): Promise<void> => {
        await graphPage.open({ savedState: SAVED_TASKS });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
      });

      await test.step('THEN the Controls sash controls graph-task-controls', async (): Promise<void> =>
        graphSashes.expectControls('controls', 'graph-task-controls'));

      await test.step('AND the task Controls panel is 320px wide', async (): Promise<void> =>
        graphSashes.expectPanelWidth('graph-task-controls', 320));
    }
  );
});
