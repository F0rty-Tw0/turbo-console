import type { FocusStep } from './common/graph.type.ts';
import { expect, test } from './graph-task.fixture.ts';
import { TASK_MODE_STATE_STUB } from './test/stubs/graph-task-mode.stub.ts';
import { tabStopsOf } from './test/utils/graph-focus-steps.spec.util.ts';
import { OVER_CAP_ROOT_TASK, overCapTaskIds, overCapTasksState } from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import { UNKNOWN_TASKS_TEXT } from '../src/graph/common/graph-task.const.ts';
import { RELAYOUT_LABEL } from '../src/graph/common/graph.const.ts';

const TOGGLE = { description: 'M4-5a spec 3.2, 3.6', type: 'requirement' };

const SHOW_TASKS = { description: 'M4-5a spec 3.3, 9a.7', type: 'requirement' };

const CAP = { description: 'M4-5a spec 3.4, 6.3', type: 'requirement' };

const CONTROLS = { description: 'M4-5a spec 6.2', type: 'requirement' };

const PACKAGES = ['app', 'lib', 'ui'];

const CHAIN = ['app#build', 'lib#build', 'ui#build'];

/** `lib#build` at depth 1: the `ui#build` it needs and its dependents `app#build` and `lib#test`, in the state's task order. */
const LIB_SET = ['app#build', 'lib#build', 'lib#test', 'ui#build'];

/** From Task mode with the chain shown: the toolbar, the task Controls (never the package ones), then the canvas. */
const TASK_STOPS: FocusStep[] = tabStopsOf([
  'Controls',
  'Details',
  'Fit',
  'Re-layout',
  'Export image',
  'Search tasks',
  'Dependents depth',
  'build',
  'Package graph'
]);

test.describe('FEATURE: graph task mode', () => {
  test.beforeEach(async ({ graphHost, graphPage, graphProbe }): Promise<void> => {
    await test.step('GIVEN the package graph of the task stub, laid out by ELK', async (): Promise<void> => {
      await graphPage.open();
      await graphHost.sendState(TASK_MODE_STATE_STUB);
      await graphProbe.expectNodeIds(PACKAGES);
    });
  });

  test(
    'GIVEN nothing chosen, the Task mode toggle turns task mode on with the prompt and nothing laid out',
    { annotation: TOGGLE },
    async ({ graphPage, graphTask, graphTaskProbe }): Promise<void> => {
      await test.step('THEN the toggle is enabled and unpressed', async (): Promise<void> => {
        await graphPage.expectEnabled('Task mode');
        await graphTask.expectPressed(false);
      });

      await test.step('WHEN Task mode is pressed', async (): Promise<void> => graphTask.toggle());

      await test.step('THEN it reads pressed', async (): Promise<void> => graphTask.expectPressed(true));

      await test.step('AND the prompt shows and no task is drawn', async (): Promise<void> => {
        await graphTask.expectPrompt();
        await graphTaskProbe.expectTaskIds([]);
      });
    }
  );

  test(
    'GIVEN the package graph, showTasks draws the chosen tasks, and an all-unknown showTasks keeps them and says so',
    { annotation: SHOW_TASKS },
    async ({ graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN showTasks names app#build', async (): Promise<void> => graphTaskHost.sendShowTasks(['app#build']));

      await test.step('THEN task mode is on with the chain drawn and no prompt', async (): Promise<void> => {
        await graphTask.expectPressed(true);
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphTask.expectPrompt(false);
      });

      await test.step('WHEN showTasks names only zzz#none', async (): Promise<void> => graphTaskHost.sendShowTasks(['zzz#none']));

      await test.step('THEN the notice says those tasks are not in this workspace', async (): Promise<void> =>
        graphTask.expectNotice(UNKNOWN_TASKS_TEXT));

      await test.step('AND the chain is still drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));
    }
  );

  test(
    'GIVEN a task over the cap, the banner counts the hidden tasks, Show all tasks lifts the cap and a depth change keeps it lifted',
    { annotation: CAP },
    async ({ graphHost, graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the over-cap state arrives and showTasks names its root', async (): Promise<void> => {
        await graphHost.sendState(overCapTasksState());
        await graphTaskHost.sendShowTasks([OVER_CAP_ROOT_TASK]);
      });

      await test.step('THEN the dependent hop is cut and the banner says 400 tasks hidden', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds([OVER_CAP_ROOT_TASK]);
        await graphTask.expectBanner(400);
      });

      await test.step('WHEN Show all tasks is pressed', async (): Promise<void> => graphTask.showAllTasks());

      await test.step('THEN all 401 tasks are drawn and the banner is gone', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds(overCapTaskIds());
        await graphTask.expectBanner(null);
      });

      await test.step('WHEN the Dependents depth is set to 0', async (): Promise<void> => graphTask.setDepth(0));

      await test.step('THEN only the root is drawn and the cap stays lifted', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds([OVER_CAP_ROOT_TASK]);
        await graphTaskHost.expectSavedTask({ depth: 0, capLifted: true });
      });

      await test.step('WHEN the Dependents depth is set back to 1', async (): Promise<void> => graphTask.setDepth(1));

      await test.step('THEN all 401 tasks are drawn with no banner', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds(overCapTaskIds());
        await graphTask.expectBanner(null);
      });
    }
  );

  test(
    'GIVEN the chain shown, Tab from Task mode walks the task Controls and never the package Controls',
    { annotation: CONTROLS },
    async ({ graphKeys, graphPage, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN showTasks names app#build', async (): Promise<void> => graphTaskHost.sendShowTasks(['app#build']));

      await test.step('AND the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND Task mode is focused', async (): Promise<void> => graphPage.focusButton('Task mode'));

      const walked = await test.step('WHEN Tab is pressed nine times', async (): Promise<FocusStep[]> => graphKeys.walk(TASK_STOPS));

      await test.step('THEN focus visited the task stops only', (): void => expect(walked).toEqual(TASK_STOPS));
    }
  );

  test(
    'GIVEN lib#build shown, a search narrows the task rows and not the drawn tasks',
    { annotation: CONTROLS },
    async ({ graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN showTasks names lib#build', async (): Promise<void> => graphTaskHost.sendShowTasks(['lib#build']));

      await test.step('THEN its set is drawn and listed', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds(LIB_SET);
        await graphTask.expectRows(LIB_SET);
      });

      await test.step('WHEN test is searched', async (): Promise<void> => graphTask.search('test'));

      await test.step('THEN only lib#test is listed', async (): Promise<void> => graphTask.expectRows(['lib#test']));

      await test.step('AND the drawn tasks are unchanged', async (): Promise<void> => graphTaskProbe.expectTaskIds(LIB_SET));

      await test.step('AND the search is saved', async (): Promise<void> => graphTaskHost.expectSavedTask({ search: 'test' }));
    }
  );

  test(
    'GIVEN the chain shown after the package graph, toggling back restores the package nodes with no new layout',
    { annotation: TOGGLE },
    async ({ graphHost, graphProbe, graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the package layout is posted once', async (): Promise<void> => graphHost.expectLayoutDones(['elk']));

      await test.step('AND showTasks names app#build', async (): Promise<void> => graphTaskHost.sendShowTasks(['app#build']));

      await test.step('AND the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND Task mode is pressed', async (): Promise<void> => graphTask.toggle());

      await test.step('THEN task mode is off and the package nodes are back', async (): Promise<void> => {
        await graphTask.expectPressed(false);
        await graphProbe.expectNodeIds(PACKAGES);
      });

      await test.step('AND no second layout was posted', async (): Promise<void> => graphHost.expectLayoutDones(['elk']));
    }
  );
});

test.describe('FEATURE: graph task mode, own openings', () => {
  test(
    'GIVEN a cold open in task mode, toggling off draws the held package graph',
    { annotation: TOGGLE },
    async ({ graphHost, graphPage, graphProbe, graphTask, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens with app#build chosen', async (): Promise<void> =>
        graphPage.open({ savedState: taskSavedState('7a5c0001', { chosen: ['app#build'] }) }));

      await test.step('AND the task state is sent', async (): Promise<void> => graphHost.sendState(TASK_MODE_STATE_STUB));

      await test.step('AND the chain is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(CHAIN));

      await test.step('AND Task mode is pressed', async (): Promise<void> => graphTask.toggle());

      await test.step('THEN the package nodes are drawn', async (): Promise<void> => graphProbe.expectNodeIds(PACKAGES));

      await test.step('AND the toggle reads unpressed', async (): Promise<void> => graphTask.expectPressed(false));
    }
  );

  test(
    'GIVEN the chain shown, a package layout landing in task mode leaves the task canvas and camera alone',
    { annotation: TOGGLE },
    async ({
      graphCamera,
      graphCanvas,
      graphGrouping,
      graphHost,
      graphPage,
      graphProbe,
      graphTask,
      graphTaskHost,
      graphTaskProbe
    }): Promise<void> => {
      await test.step('WHEN the page opens with held workers and the package graph is laid out', async (): Promise<void> => {
        await graphPage.open({ workers: 'held' });
        await graphHost.sendState(TASK_MODE_STATE_STUB);
        await graphGrouping.releaseWorker();
        await graphProbe.expectNodeIds(PACKAGES);
      });

      await test.step('AND the chain is shown, then Task mode is pressed', async (): Promise<void> => {
        await graphTaskHost.sendShowTasks(['app#build']);
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphTask.toggle();
        await graphProbe.expectNodeIds(PACKAGES);
      });

      await test.step('AND the worker is held, Re-layout is pressed and Task mode pressed again', async (): Promise<void> => {
        await graphGrouping.holdWorker();
        await graphPage.pressButton(RELAYOUT_LABEL);
        await graphTask.toggle();
      });

      await test.step('AND the chain is back and panned, and the camera remembered', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphCanvas.panBy(120, 80);
        await graphCamera.rememberCamera();
      });

      await test.step('AND the held package layout lands', async (): Promise<void> => {
        await graphGrouping.releaseWorker();
        await graphHost.expectLayoutDones(['elk', 'elk']);
      });

      await test.step('THEN the chain and the camera are unchanged', async (): Promise<void> => {
        await graphTaskProbe.expectTaskIds(CHAIN);
        await graphCamera.expectCameraUnchanged();
      });
    }
  );
});
