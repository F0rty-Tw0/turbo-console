import type { PngBounds } from './common/graph.type.ts';
import { test } from './graph-task.fixture.ts';
import { TASK_MODE_MORE_TASKS_STUB, TASK_MODE_NEW_HASH_STUB, TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import { TASK_MODE_LABEL } from '../src/graph/common/graph-task.const.ts';
import { FIT_LABEL, RELAYOUT_LABEL } from '../src/graph/common/graph.const.ts';

const RF3 = { description: 'M4-5a RF3', type: 'requirement' };

const ANY_SIDE: PngBounds = { minWidth: 1, maxWidth: 4096, minHeight: 1, maxHeight: 4096 };

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

/** `lib#build` at depth 1: the `ui#build` it needs and its dependents `app#build` and `lib#test`. */
const LIB_SET = ['app#build', 'lib#build', 'lib#test', 'ui#build'];

const SAVED_TASK_VIEW = taskSavedState('7a5c0001', { chosen: ['app#build'] });

test.describe('FEATURE: graph task layout', () => {
  test(
    'GIVEN a saved task view, a new GraphReady hash keeps the task canvas and camera',
    { annotation: RF3 },
    async ({ graphCamera, graphHost, graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens with app#build chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_TASK_VIEW }));

      await test.step('AND the task state is sent', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('THEN the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND each task sits in its package compound', async (): Promise<void> =>
        graphTaskProbe.expectBoxIds(['pkg:app', 'pkg:lib', 'pkg:ui']));

      await test.step('AND the task view saved a layout key', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ chosen: ['app#build'] }));

      await test.step('AND no positions were posted', async (): Promise<void> => graphHost.expectNoPositionsPosted());

      await test.step('WHEN the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND a state with a new hash arrives', async (): Promise<void> => graphHost.sendState(TASK_MODE_NEW_HASH_STUB));

      await test.step('THEN the tasks and camera are unchanged', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphCamera.expectCameraUnchanged();
      });

      await test.step('AND still no positions were posted', async (): Promise<void> => graphHost.expectNoPositionsPosted());
    }
  );

  test(
    'GIVEN the chain drawn, a same-hash state with a new dependent draws it and fits',
    { annotation: RF3 },
    async ({ graphCanvas, graphHost, graphPage, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens with app#build chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_TASK_VIEW }));

      await test.step('AND the task state is sent', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('AND the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND the same hash arrives with app#deploy', async (): Promise<void> =>
        graphHost.sendState(TASK_MODE_MORE_TASKS_STUB));

      await test.step('THEN app#deploy is drawn too', async (): Promise<void> =>
        graphTaskProbe.expectTaskIds([...CHAIN, 'app#deploy']));

      await test.step('AND every task is in view', async (): Promise<void> => graphCanvas.expectAllNodesInView());
    }
  );

  test(
    'GIVEN the chain drawn, a tap on a package compound and on a link change nothing',
    { annotation: RF3 },
    async ({ graphCanvas, graphHost, graphLink, graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens with app#build chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_TASK_VIEW }));

      await test.step('AND the task state is sent', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('AND the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND pkg:app is tapped', async (): Promise<void> => graphCanvas.tapNode('pkg:app'));

      await test.step('AND the app#build to lib#build link is tapped', async (): Promise<void> =>
        graphLink.tapLink('app#build', 'lib#build'));

      await test.step('THEN the chain is still drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND no explainEdge was posted', async (): Promise<void> => graphTaskHost.expectNoExplainPosted());
    }
  );

  test(
    'GIVEN the chain drawn, Fit, Re-layout and Export image act on the task graph',
    { annotation: RF3 },
    async ({ graphCamera, graphCanvas, graphExport, graphHost, graphPage, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens with app#build chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_TASK_VIEW }));

      await test.step('AND the task state is sent', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('AND the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(120, 80));

      await test.step('AND the camera is remembered', async (): Promise<void> => graphCamera.rememberCamera());

      await test.step('AND Fit is pressed', async (): Promise<void> => graphPage.pressButton(FIT_LABEL));

      await test.step('THEN the camera moved to frame every task', async (): Promise<void> => {
        await graphCamera.expectCameraMoved();
        await graphCanvas.expectAllNodesInView();
      });

      await test.step('WHEN Re-layout is pressed', async (): Promise<void> => graphPage.pressButton(RELAYOUT_LABEL));

      await test.step('THEN the chain is still drawn and no positions were posted', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphHost.expectNoPositionsPosted();
      });

      await test.step('WHEN Export image is pressed', async (): Promise<void> => graphExport.press());

      await test.step('THEN one PNG is posted', async (): Promise<void> => graphExport.expectOnePng(ANY_SIDE));
    }
  );

  test(
    'GIVEN the chain drawn, Enter on the container opens no package details',
    { annotation: RF3 },
    async ({ graphHost, graphPage, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens with app#build chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_TASK_VIEW }));

      await test.step('AND the task state is sent', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('AND the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND Enter is pressed on the container', async (): Promise<void> => {
        await graphPage.focusContainer();
        await graphPage.pressKey('Enter');
      });

      await test.step('THEN no openDetails is posted', async (): Promise<void> => graphHost.expectNoOpenDetails());
    }
  );

  test(
    'GIVEN a cold open in task mode with the package graph held, the toolbar acts on the task graph',
    { annotation: RF3 },
    async ({ graphHost, graphPage, graphTask, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens with app#build chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_TASK_VIEW }));

      await test.step('AND one task state is sent', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('THEN the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND Fit and Re-layout are enabled', async (): Promise<void> => {
        await graphPage.expectEnabled(FIT_LABEL);
        await graphPage.expectEnabled(RELAYOUT_LABEL);
      });

      await test.step('AND the Task mode toggle is enabled and pressed', async (): Promise<void> => {
        await graphPage.expectEnabled(TASK_MODE_LABEL);
        await graphTask.expectPressed(true);
      });
    }
  );

  test(
    'GIVEN a cold open in task mode, a state, runs and showTasks arriving together draw the shown tasks',
    { annotation: RF3 },
    async ({ graphHost, graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens with app#build chosen', async (): Promise<void> =>
        graphPage.open({ savedState: SAVED_TASK_VIEW }));

      await test.step('AND a state with no cached positions, runs and showTasks arrive together', async (): Promise<void> => {
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphTaskHost.sendRuns({ 'app#build': 'running' });
        await graphTaskHost.sendShowTasks(['lib#build']);
      });

      await test.step('THEN the graph body shows lib#build with its dependency and dependents', async (): Promise<void> => {
        await graphPage.expectNotLoading();
        await graphTaskProbe.expectTaskIds(LIB_SET);
        await graphPage.expectEnabled(FIT_LABEL);
      });
    }
  );
});
