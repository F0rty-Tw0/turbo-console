import { test } from './graph-task.fixture.ts';
import { DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { TASK_DETAILS_ID } from '../src/graph/common/graph-task.const.ts';
import { DETAILS_ID } from '../src/graph/common/graph.const.ts';

const U3_D1 = { description: 'U3 spec D1, R1', type: 'requirement' };

const CORE_STATUS = 'core · 2 dependencies, 1 direct · 5 dependents, 2 direct';

const UI_STATUS = 'ui · 3 dependencies, 1 direct · 3 dependents, 2 direct';

const PACKAGES = ['app', 'lib', 'ui'];

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

test.describe('FEATURE: graph Details bar', () => {
  test.describe('JOURNEY: the package graph', () => {
    test.beforeEach(async ({ graphHost, graphPage }): Promise<void> => {
      await test.step('GIVEN the details graph, nothing selected', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
      });
    });

    test(
      'GIVEN nothing selected, the bar is hidden until core is tapped, then shows its summary and Clear selection',
      { annotation: U3_D1 },
      async ({ graphCanvas, graphDetailsBar }): Promise<void> => {
        await test.step('THEN the bar is hidden and Clear selection disabled', async (): Promise<void> =>
          graphDetailsBar.expectClearHidden());

        await test.step('WHEN core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

        await test.step('THEN the bar shows with Clear selection enabled', async (): Promise<void> =>
          graphDetailsBar.expectClearShown());

        await test.step('AND the summary reads the inspection text', async (): Promise<void> =>
          graphDetailsBar.expectSummary(CORE_STATUS));

        await test.step('AND Clear selection draws the clear-all icon', async (): Promise<void> =>
          graphDetailsBar.expectClearIcon('clear-all'));

        await test.step('AND the bar is the first child of the package Details aside', async (): Promise<void> =>
          graphDetailsBar.expectFirstIn(DETAILS_ID));
      }
    );

    test(
      'GIVEN core selected, tapping ui keeps the bar first in the aside and changes its summary',
      { annotation: U3_D1 },
      async ({ graphCanvas, graphDetailsBar }): Promise<void> => {
        await test.step('WHEN core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

        await test.step('AND ui is tapped', async (): Promise<void> => graphCanvas.tapNode('ui'));

        await test.step('THEN the summary reads ui', async (): Promise<void> => graphDetailsBar.expectSummary(UI_STATUS));

        await test.step('AND the bar is still the first child of the package Details aside', async (): Promise<void> =>
          graphDetailsBar.expectFirstIn(DETAILS_ID));
      }
    );

    test(
      'GIVEN core selected, the toolbar holds no Clear selection and its status line is read out but not drawn',
      { annotation: U3_D1 },
      async ({ graphCanvas, graphPage, graphToolbar }): Promise<void> => {
        await test.step('WHEN core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

        await test.step('THEN no button stands alone in the toolbar', async (): Promise<void> => graphToolbar.expectNoLoneButton());

        await test.step('AND the status line still reads core', async (): Promise<void> => graphPage.expectStatus(CORE_STATUS));

        await test.step('AND it is visually hidden, a 1 px box', async (): Promise<void> => graphToolbar.expectStatusHidden());
      }
    );

    test(
      'GIVEN core selected and Details closed, Escape on the canvas clears the selection',
      { annotation: U3_D1 },
      async ({ graphCanvas, graphDetails, graphDetailsBar, graphPage, graphProbe }): Promise<void> => {
        await test.step('WHEN core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

        await test.step('AND Details is closed', async (): Promise<void> => graphDetails.toggle());

        await test.step('AND Escape is pressed on the canvas', async (): Promise<void> => {
          await graphPage.container.focus();
          await graphPage.pressKey('Escape');
        });

        await test.step('THEN nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));

        await test.step('AND the bar is hidden and Clear selection disabled', async (): Promise<void> =>
          graphDetailsBar.expectClearHidden());
      }
    );
  });

  test(
    'GIVEN task mode, tapping app#build then lib#build keeps the bar first in the task aside, shown, with no summary',
    { annotation: U3_D1 },
    async ({
      graphCanvas,
      graphDetailsBar,
      graphHost,
      graphPage,
      graphProbe,
      graphTask,
      graphTaskHost,
      graphTaskProbe
    }): Promise<void> => {
      await test.step('WHEN the task stub is shown in task mode on the app#build chain', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(PACKAGES);
        await graphTask.enter();
        await graphTaskHost.sendShowTasks(['app#build']);
        await graphTaskProbe.expectTaskIds(CHAIN);
      });

      await test.step('AND app#build is tapped', async (): Promise<void> => graphCanvas.tapNode('app#build'));

      await test.step('THEN the bar shows, first in the task aside, with an empty summary', async (): Promise<void> => {
        await graphDetailsBar.expectClearShown();
        await graphDetailsBar.expectFirstIn(TASK_DETAILS_ID);
        await graphDetailsBar.expectSummary('');
      });

      await test.step('WHEN lib#build is tapped', async (): Promise<void> => graphCanvas.tapNode('lib#build'));

      await test.step('THEN the bar still shows, first in the task aside, with an empty summary', async (): Promise<void> => {
        await graphDetailsBar.expectClearShown();
        await graphDetailsBar.expectFirstIn(TASK_DETAILS_ID);
        await graphDetailsBar.expectSummary('');
      });
    }
  );

  test(
    'GIVEN the chain shown in task mode, every mode switch moves the bar to the shown aside, with Details open and closed',
    { annotation: U3_D1 },
    async ({
      graphDetails,
      graphDetailsBar,
      graphHost,
      graphPage,
      graphProbe,
      graphTask,
      graphTaskHost,
      graphTaskProbe
    }): Promise<void> => {
      await test.step('WHEN the package graph shows, Tasks is pressed and the app#build chain is shown', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(PACKAGES);
        await graphTask.enter();
        await graphTaskHost.sendShowTasks(['app#build']);
        await graphTaskProbe.expectTaskIds(CHAIN);
      });

      await test.step('THEN the bar is in the task aside', async (): Promise<void> => graphDetailsBar.expectFirstIn(TASK_DETAILS_ID));

      await test.step('WHEN Packages is pressed', async (): Promise<void> => {
        await graphTask.leave();
        await graphProbe.expectNodeIds(PACKAGES);
      });

      await test.step('THEN the bar is in the package aside', async (): Promise<void> => graphDetailsBar.expectFirstIn(DETAILS_ID));

      await test.step('WHEN Tasks is pressed', async (): Promise<void> => graphTask.enter());

      await test.step('THEN the bar is in the task aside', async (): Promise<void> => graphDetailsBar.expectFirstIn(TASK_DETAILS_ID));

      await test.step('WHEN Packages is pressed and Details is closed', async (): Promise<void> => {
        await graphTask.leave();
        await graphProbe.expectNodeIds(PACKAGES);
        await graphDetails.toggle();
        await graphDetails.expectExpanded(false);
      });

      await test.step('THEN the bar is in the package aside', async (): Promise<void> => graphDetailsBar.expectFirstIn(DETAILS_ID));

      await test.step('WHEN Tasks is pressed', async (): Promise<void> => graphTask.enter());

      await test.step('THEN the bar is in the task aside', async (): Promise<void> => graphDetailsBar.expectFirstIn(TASK_DETAILS_ID));

      await test.step('WHEN Packages is pressed', async (): Promise<void> => graphTask.leave());

      await test.step('THEN the bar is in the package aside', async (): Promise<void> => graphDetailsBar.expectFirstIn(DETAILS_ID));
    }
  );
});
