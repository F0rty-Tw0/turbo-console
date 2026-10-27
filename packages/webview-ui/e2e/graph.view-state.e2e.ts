import { test } from './graph-task.fixture.ts';
import { DIAMOND_CHAIN_CACHED_STUB, EDITED_STUB } from './test/stubs/graph-state.stub.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import type { GraphViewState } from '../src/bridge/common/graph-view-state.type.ts';

const AC3 = { description: 'M4-1 AC3', type: 'requirement' };

const TASK_VIEW = { description: 'M4-5a spec 3.6-3.7', type: 'requirement' };

const ORIGIN = { x: 0, y: 0 };

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

/** The task camera of `carried` as the view `GraphLook.expectView` checks: its zoom and pan, and no package selected. */
const taskCameraOf = (carried: GraphViewState): GraphViewState => {
  const { task } = carried;

  if (task === null) throw new Error('graph e2e: the saved view holds no task view');

  const view: GraphViewState = { ...carried, zoom: task.zoom, pan: task.pan, selected: null };

  return view;
};

/** The diamond's hash and a real package, but a zoom that is not a number. */
const BAD_ZOOM_VIEW = { hash: 'a1b2c3d4', zoom: 'wide', pan: ORIGIN, selected: 'core' };

test.describe('FEATURE: graph view state', () => {
  test(
    'GIVEN a zoomed, panned graph with core selected, reopening with the saved view restores it',
    { annotation: AC3 },
    async ({ graphCanvas, graphHost, graphLook, graphPage }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('THEN the view is saved', async (): Promise<void> => graphHost.expectViewSaved());

      const carried = await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND the same state is sent again', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('THEN zoom, pan and selection are the saved ones', async (): Promise<void> => graphLook.expectView(carried));

      await test.step('AND no worker was created', async (): Promise<void> => graphHost.expectWorkers(0));
    }
  );

  test(
    'GIVEN a saved view for another hash, the page fits and keeps a selection that still exists',
    { annotation: AC3 },
    async ({ graphCanvas, graphHost, graphLook, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('AND core is tapped', async (): Promise<void> => graphCanvas.tapNode('core'));

      await test.step('AND the graph is zoomed', async (): Promise<void> => graphCanvas.zoomBy(-300));

      await test.step('AND the graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('THEN the view is saved', async (): Promise<void> => graphHost.expectViewSaved());

      const carried = await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND an edited graph state without positions is sent', async (): Promise<void> =>
        graphHost.sendState(EDITED_STUB));

      await test.step('THEN the layout came from ELK', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

      await test.step('AND the view was fitted, not restored', async (): Promise<void> => graphLook.expectViewNot(carried));

      await test.step('AND core is still selected', async (): Promise<void> => graphProbe.expectSelected('core'));
    }
  );

  test(
    'GIVEN a saved selection whose package is gone, the selection is dropped',
    { annotation: AC3 },
    async ({ graphCanvas, graphHost, graphPage, graphProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the edited graph state is sent', async (): Promise<void> => graphHost.sendState(EDITED_STUB));

      await test.step('AND cli is tapped', async (): Promise<void> => graphCanvas.tapNode('cli'));

      await test.step('THEN cli is selected', async (): Promise<void> => graphProbe.expectSelected('cli'));

      await test.step('AND the view is saved', async (): Promise<void> => graphHost.expectViewSaved());

      await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> => graphHost.reopen());

      await test.step('AND a cached state without cli is sent', async (): Promise<void> =>
        graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

      await test.step('THEN nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));
    }
  );

  test('GIVEN a saved view whose zoom is not a number, the page ignores it, fits and selects nothing', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe
  }): Promise<void> => {
    await test.step('WHEN the page is opened with that saved view', async (): Promise<void> =>
      graphPage.open({ savedState: BAD_ZOOM_VIEW }));

    await test.step('AND a cached graph state is sent', async (): Promise<void> => graphHost.sendState(DIAMOND_CHAIN_CACHED_STUB));

    await test.step('THEN seven nodes are drawn', async (): Promise<void> => graphProbe.expectNodeCount(7));

    await test.step('AND nothing is selected', async (): Promise<void> => graphProbe.expectSelected(null));

    await test.step('AND every node lies inside the container', async (): Promise<void> => graphCanvas.expectAllNodesInView());

    await test.step('AND no console or page error is logged', (): void => graphPage.expectNoErrors());
  });

  test(
    'GIVEN a zoomed, panned task view, reopening with the saved view restores task mode and that camera',
    { annotation: TASK_VIEW },
    async ({ graphCanvas, graphHost, graphLook, graphPage, graphTask, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens with app#build chosen', async (): Promise<void> =>
        graphPage.open({ savedState: taskSavedState(TASK_MODE_STATE_STUB.hash, { chosen: ['app#build'] }) }));

      await test.step('AND the task state is sent', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('AND the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND the graph is zoomed and panned', async (): Promise<void> => {
        await graphCanvas.zoomBy(-300);
        await graphCanvas.panBy(40, 25);
      });

      await test.step('THEN the task camera is saved', async (): Promise<void> => graphTask.expectCameraSaved());

      const carried = await test.step('WHEN the page is reopened with the saved view', async (): Promise<GraphViewState> =>
        graphHost.reopen());

      await test.step('AND the same state is sent again', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('THEN task mode is on with the chain drawn', async (): Promise<void> => {
        await graphTask.expectPressed(true);
        await graphTaskProbe.expectTaskIds(CHAIN);
      });

      await test.step('AND zoom and pan are the saved task camera', async (): Promise<void> =>
        graphLook.expectView(taskCameraOf(carried)));
    }
  );

  test(
    'GIVEN task mode left and the package camera moved, the saved state still holds the task view',
    { annotation: TASK_VIEW },
    async ({ graphCanvas, graphHost, graphPage, graphProbe, graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page is opened', async (): Promise<void> => graphPage.open());

      await test.step('AND the task state is sent and laid out', async (): Promise<void> => {
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphProbe.expectNodeIds(['app', 'lib', 'ui']);
      });

      await test.step('AND showTasks names app#build', async (): Promise<void> => {
        await graphTaskHost.sendShowTasks(['app#build']);
        await graphTaskProbe.expectTaskIds(CHAIN);
      });

      await test.step('AND Packages is pressed to leave', async (): Promise<void> => {
        await graphTask.leave();
        await graphProbe.expectNodeIds(['app', 'lib', 'ui']);
      });

      await test.step('AND the package graph is panned', async (): Promise<void> => graphCanvas.panBy(40, 25));

      await test.step('THEN the package camera is saved', async (): Promise<void> => graphHost.expectViewSaved());

      await test.step('AND the saved task view still chooses app#build', async (): Promise<void> =>
        graphTaskHost.expectSavedTask({ chosen: ['app#build'] }));
    }
  );
});
