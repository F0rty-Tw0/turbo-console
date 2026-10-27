import { test } from './graph-task.fixture.ts';
import { DETAILS_EDITED_STUB, DETAILS_STUB } from './test/stubs/graph-details.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';

const U3A_S1 = { description: 'U3a review S1, quality 2', type: 'requirement' };

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

test.describe('FEATURE: focus on the Details bar', () => {
  test.describe('JOURNEY: task mode, app#build selected', () => {
    test.beforeEach(async ({ graphCanvas, graphDetailsBar, graphHost, graphPage, graphTaskProbe }): Promise<void> => {
      await test.step('GIVEN the page opened cold in task mode on the app#build chain', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphTaskProbe.expectTaskIds(CHAIN);
      });

      await test.step('AND app#build tapped, so the bar shows', async (): Promise<void> => {
        await graphCanvas.tapNode('app#build');
        await graphDetailsBar.expectClearShown();
      });
    });

    test(
      'GIVEN focus on Clear selection, a runs update refills the panel and Clear keeps focus',
      { annotation: U3A_S1 },
      async ({ graphDetailsBar, graphTaskDetails, graphTaskHost }): Promise<void> => {
        await test.step('WHEN focus goes to Clear selection', async (): Promise<void> => graphDetailsBar.focusClear());

        await test.step('AND the host sends app#build running', async (): Promise<void> =>
          graphTaskHost.sendRuns({ 'app#build': 'running' }));

        await test.step('THEN the panel shows the new state', async (): Promise<void> => graphTaskDetails.expectState('Running'));

        await test.step('AND Clear selection still has focus', async (): Promise<void> => graphDetailsBar.expectClearFocused());
      }
    );

    test(
      'GIVEN focus on Clear selection, Enter clears the selection and the empty view heading takes focus',
      { annotation: U3A_S1 },
      async ({ graphDetailsBar, graphTaskDetails }): Promise<void> => {
        await test.step('WHEN Clear selection is pressed by keyboard', async (): Promise<void> => {
          await graphDetailsBar.focusClear();
          await graphDetailsBar.pressClearByKey();
        });

        await test.step('THEN the panel is empty', async (): Promise<void> => graphTaskDetails.expectEmpty());

        await test.step('AND its Details heading has focus', async (): Promise<void> => graphTaskDetails.expectHeadingFocused());
      }
    );
  });

  test.describe('JOURNEY: the package graph, data selected', () => {
    test.beforeEach(async ({ graphCanvas, graphDetailsBar, graphHost, graphPage }): Promise<void> => {
      await test.step('GIVEN the details graph with data tapped', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(DETAILS_STUB);
        await graphCanvas.tapNode('data');
        await graphDetailsBar.expectClearShown();
      });
    });

    test(
      'GIVEN focus on Clear selection, a graph with a new hash rebuilds the panel and Clear keeps focus',
      { annotation: U3A_S1 },
      async ({ graphDetails, graphDetailsBar, graphHost }): Promise<void> => {
        await test.step('WHEN focus goes to Clear selection', async (): Promise<void> => graphDetailsBar.focusClear());

        await test.step('AND the edited graph is sent', async (): Promise<void> => graphHost.sendState(DETAILS_EDITED_STUB));

        await test.step('THEN the dependencies are the edited ones', async (): Promise<void> =>
          graphDetails.expectNeighbours('Direct dependencies', ['base', 'core']));

        await test.step('AND Clear selection still has focus', async (): Promise<void> => graphDetailsBar.expectClearFocused());
      }
    );

    test(
      'GIVEN focus on Clear selection, Enter clears the selection and the empty view heading takes focus',
      { annotation: U3A_S1 },
      async ({ graphDetails, graphDetailsBar }): Promise<void> => {
        await test.step('WHEN Clear selection is pressed by keyboard', async (): Promise<void> => {
          await graphDetailsBar.focusClear();
          await graphDetailsBar.pressClearByKey();
        });

        await test.step('THEN the panel is empty', async (): Promise<void> => graphDetails.expectEmpty());

        await test.step('AND its Details heading has focus', async (): Promise<void> => graphDetails.expectHeadingFocused());
      }
    );
  });
});
