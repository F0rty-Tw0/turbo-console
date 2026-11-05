import { expect, test } from './graph-toolbar.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { THEME_DARK_STUB } from './test/stubs/graph-theme.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphWebviewMessage } from '../src/bridge/common/graph-message.type.ts';
import { RUN_LABEL, RUN_NO_CACHE_LABEL, STOP_LABEL } from '../src/graph/common/graph-task.const.ts';
import { runStateTextOf, stopLabelOf, stopRunOfLabelOf } from '../src/graph/utils/controls-text.util.ts';

const D12 = { description: 'U7 spec D12', type: 'requirement' };

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

const STOP_OF_APP = stopRunOfLabelOf('app#build');

const OWNED_STATE = runStateTextOf('running', 'app#build');

const POST_STOP_APP: GraphWebviewMessage = { type: 'stopTask', taskId: 'app#build' };

const POST_STOP_LIB: GraphWebviewMessage = { type: 'stopTask', taskId: 'lib#build' };

const POST_RUN_LIB: GraphWebviewMessage = { type: 'runTask', taskId: 'lib#build', noCache: false };

const LIB_UNDER_APP = { 'lib#build': 'app#build' };

const SELECTED_RGB = THEME_DARK_STUB.expected.selected;

const SELECTION_RING = { drawn: SELECTED_RGB, absent: 'rgb(204,167,0)' };

test.describe('FEATURE: Stop on a dependency that runs under another task run', () => {
  test.beforeEach(async ({ graphHost, graphPage, graphTaskProbe }): Promise<void> => {
    await test.step('GIVEN a cold open in task mode with app#build chosen', async (): Promise<void> => {
      await graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) });
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphTaskProbe.expectTaskIds(CHAIN);
    });
  });

  test(
    'GIVEN lib#build running under app#build, its panel names the run and its Stop posts the owner',
    { annotation: D12 },
    async ({ graphCanvas, graphTaskDetails, graphTaskHost }): Promise<void> => {
      await test.step('WHEN the host reports lib#build running in the run of app#build and lib#build is tapped', async (): Promise<void> => {
        await graphTaskHost.sendOwnedRuns({ 'app#build': 'running', 'lib#build': 'running' }, LIB_UNDER_APP);
        await graphCanvas.tapNode('lib#build');
      });

      await test.step('THEN the status names the run', async (): Promise<void> => graphTaskDetails.expectState(OWNED_STATE));

      await test.step('AND Stop is named for the run but still reads Stop', async (): Promise<void> =>
        expect(graphTaskDetails.stopNamed(STOP_OF_APP)).toHaveText(STOP_LABEL));

      await test.step('WHEN Stop is clicked', async (): Promise<void> => graphTaskDetails.stopNamed(STOP_OF_APP).click());

      await test.step('THEN stopTask is posted for app#build', async (): Promise<void> =>
        graphTaskHost.expectTaskPosts([POST_STOP_APP]));
    }
  );

  test(
    'GIVEN lib#build running under app#build, its toolbar Stop and its menu Stop post the owner and its Run still posts lib#build',
    { annotation: D12 },
    async ({ graphCanvas, graphMenus, graphTask, graphTaskHost, graphTaskToolbar }): Promise<void> => {
      await test.step('WHEN lib#build is running under app#build, tapped and in view', async (): Promise<void> => {
        await graphTaskHost.sendOwnedRuns({ 'app#build': 'running', 'lib#build': 'running' }, LIB_UNDER_APP);
        await graphCanvas.tapNode('lib#build');
        await graphTaskToolbar.expectNodeInView('lib#build');
      });

      await test.step('AND the toolbar slot is pressed', async (): Promise<void> =>
        graphTaskToolbar.buttonOf('lib#build', STOP_OF_APP).click());

      await test.step('THEN stopTask is posted for app#build', async (): Promise<void> =>
        graphTaskHost.expectTaskPosts([POST_STOP_APP]));

      await test.step('WHEN the menu opens', async (): Promise<void> => graphTask.menu('lib#build'));

      await test.step('THEN it offers Run, Run without cache and the owner Stop', async (): Promise<void> =>
        graphMenus.expectItems([RUN_LABEL, RUN_NO_CACHE_LABEL, STOP_OF_APP]));

      await test.step('WHEN the owner Stop item is clicked', async (): Promise<void> => graphMenus.item(STOP_OF_APP).click());

      await test.step('THEN stopTask is posted for app#build again', async (): Promise<void> =>
        graphTaskHost.expectTaskPosts([POST_STOP_APP, POST_STOP_APP]));

      await test.step('WHEN the menu reopens and Run is clicked', async (): Promise<void> => {
        await graphTask.menu('lib#build');
        await graphMenus.item(RUN_LABEL).click();
      });

      await test.step('THEN runTask is posted for lib#build, not the owner', async (): Promise<void> =>
        graphTaskHost.expectTaskPosts([POST_STOP_APP, POST_STOP_APP, POST_RUN_LIB]));
    }
  );

  test(
    'GIVEN ui#build running under app#all, which the graph does not list, its Stop still posts app#all',
    { annotation: D12 },
    async ({ graphCanvas, graphTaskDetails, graphTaskHost }): Promise<void> => {
      await test.step('WHEN ui#build runs under app#all and is tapped', async (): Promise<void> => {
        await graphTaskHost.sendOwnedRuns({ 'ui#build': 'running' }, { 'ui#build': 'app#all' });
        await graphCanvas.tapNode('ui#build');
      });

      await test.step('AND its Stop is clicked', async (): Promise<void> =>
        graphTaskDetails.stopNamed(stopRunOfLabelOf('app#all')).click());

      await test.step('THEN stopTask is posted for app#all', async (): Promise<void> =>
        graphTaskHost.expectTaskPosts([{ type: 'stopTask', taskId: 'app#all' }]));
    }
  );

  test(
    'GIVEN lib#build running on its own, an owner arriving relabels the same toolbar slot, and the owner leaving restores it',
    { annotation: D12 },
    async ({ graphCanvas, graphTaskDetails, graphTaskHost, graphTaskToolbar }): Promise<void> => {
      await test.step('WHEN lib#build runs on its own and is tapped', async (): Promise<void> => {
        await graphTaskHost.sendRuns({ 'lib#build': 'running' });
        await graphCanvas.tapNode('lib#build');
      });

      await test.step('THEN the status, the toolbar slot and Stop are its own', async (): Promise<void> => {
        await graphTaskDetails.expectState('Running');
        await expect(graphTaskToolbar.buttonOf('lib#build', stopLabelOf('lib#build'))).toBeVisible();
        await expect(graphTaskDetails.stop).toBeVisible();
      });

      await test.step('WHEN Stop is clicked', async (): Promise<void> => graphTaskDetails.stop.click());

      await test.step('THEN stopTask is posted for lib#build', async (): Promise<void> =>
        graphTaskHost.expectTaskPosts([POST_STOP_LIB]));

      await test.step('WHEN the host reports an owner for lib#build with no reselect', async (): Promise<void> =>
        graphTaskHost.sendOwnedRuns({ 'lib#build': 'running' }, LIB_UNDER_APP));

      await test.step('THEN the panel names the run and the same slot reads the owner Stop', async (): Promise<void> => {
        await graphTaskDetails.expectState(OWNED_STATE);
        await expect(graphTaskToolbar.buttonOf('lib#build', STOP_OF_APP)).toBeVisible();
      });

      await test.step('WHEN a plain runs message arrives again', async (): Promise<void> =>
        graphTaskHost.sendRuns({ 'lib#build': 'running' }));

      await test.step('THEN the slot reads Stop lib#build again', async (): Promise<void> =>
        expect(graphTaskToolbar.buttonOf('lib#build', stopLabelOf('lib#build'))).toBeVisible());
    }
  );

  test(
    'GIVEN lib#build continuous under app#build, its panel reads Continuous in the run and its Stop posts the owner',
    { annotation: D12 },
    async ({ graphCanvas, graphTaskDetails, graphTaskHost }): Promise<void> => {
      await test.step('WHEN lib#build is continuous under app#build and tapped', async (): Promise<void> => {
        await graphTaskHost.sendOwnedRuns({ 'lib#build': 'continuous' }, LIB_UNDER_APP);
        await graphCanvas.tapNode('lib#build');
      });

      await test.step('THEN the status names the run', async (): Promise<void> =>
        graphTaskDetails.expectState(runStateTextOf('continuous', 'app#build')));

      await test.step('WHEN Stop is clicked', async (): Promise<void> => graphTaskDetails.stopNamed(STOP_OF_APP).click());

      await test.step('THEN stopTask is posted for app#build', async (): Promise<void> =>
        graphTaskHost.expectTaskPosts([POST_STOP_APP]));
    }
  );

  test(
    'GIVEN lib#build running under app#build in the dark theme, tapping it draws the selection ring alone',
    { annotation: D12 },
    async ({ graphCanvas, graphLook, graphTaskHost, graphTaskRings }): Promise<void> => {
      await test.step('WHEN the dark theme applies and lib#build runs under app#build', async (): Promise<void> => {
        await graphLook.applyTheme(THEME_DARK_STUB);
        await graphTaskHost.sendOwnedRuns({ 'lib#build': 'running' }, LIB_UNDER_APP);
      });

      await test.step('AND lib#build is tapped', async (): Promise<void> => graphCanvas.tapNode('lib#build'));

      await test.step('THEN the selection ring alone is drawn', async (): Promise<void> =>
        graphTaskRings.expectRings('lib#build', SELECTION_RING));
    }
  );
});
