import { expect, test } from './graph-task.fixture.ts';
import {
  OVER_CAP_ROOT_TASK,
  TARGET_LIKE_CHOSEN_TASK,
  overCapTaskIds,
  overCapTasksState,
  targetLikeTasksState
} from './test/utils/graph-target-like-tasks.spec.util.ts';
import { taskSavedState } from './test/utils/graph-task-saved.spec.util.ts';
import { shownSetOf } from '../src/graph/utils/shown-set.util.ts';

const AC3 = { description: 'M4-5a AC3', type: 'requirement' };

const AC4 = { description: 'M4-5a AC4', type: 'requirement' };

const TARGET_LIKE_HASH = '7a7a7a7b';

/** `lib-3#build` at depth 1: the `hub#build` it needs, its four own tasks, and the `feat-2#build` and `feat-3#build` that need it. */
const CHOSEN_SHOWN_COUNT = 8;

/** The 400 dependents `shownSetOf` cuts at the cap, leaving the root alone. */
const OVER_CAP_HIDDEN_COUNT = 400;

const OVER_CAP_TASK_COUNT = 401;

const TARGET_LIKE_TASKS = targetLikeTasksState().tasks;

const CHOSEN_SHOWN = shownSetOf({ tasks: TARGET_LIKE_TASKS, chosen: [TARGET_LIKE_CHOSEN_TASK], depth: 1, capLifted: false }).ids;

const OVER_CAP_CUT = shownSetOf({ tasks: overCapTasksState().tasks, chosen: [OVER_CAP_ROOT_TASK], depth: 1, capLifted: false });

test.describe('FEATURE: graph task mode on a target-like state', () => {
  test(
    'GIVEN a saved task view with nothing chosen, the target-like state shows the prompt and lays out nothing',
    { annotation: AC3 },
    async ({ graphHost, graphPage, graphTask, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens in task mode with nothing chosen', async (): Promise<void> =>
        graphPage.open({ savedState: taskSavedState(TARGET_LIKE_HASH, {}) }));

      await test.step('AND the target-like state arrives', async (): Promise<void> => graphHost.sendState(targetLikeTasksState()));

      await test.step('THEN the prompt shows', async (): Promise<void> => graphTask.expectPrompt());

      await test.step('AND no task is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds([]));
    }
  );

  test(
    'GIVEN the target-like state, one chosen task lays out its chain and its dependents at depth 1',
    { annotation: AC3 },
    async ({ graphHost, graphPage, graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the page opens in task mode with the state sent', async (): Promise<void> => {
        await graphPage.open({ savedState: taskSavedState(TARGET_LIKE_HASH, {}) });
        await graphHost.sendState(targetLikeTasksState());
      });

      await test.step('AND showTasks names one task', async (): Promise<void> =>
        graphTaskHost.sendShowTasks([TARGET_LIKE_CHOSEN_TASK]));

      await test.step('THEN the shown set of that task is drawn', async (): Promise<void> =>
        graphTaskProbe.expectTaskIds(CHOSEN_SHOWN));

      await test.step('AND that shown set is the literal count', (): void => expect(CHOSEN_SHOWN).toHaveLength(CHOSEN_SHOWN_COUNT));

      await test.step('AND the prompt is gone', async (): Promise<void> => graphTask.expectPrompt(false));
    }
  );

  test(
    'GIVEN an over-cap choice, the banner counts the hidden tasks and Show all tasks lays out everything',
    { annotation: AC4 },
    async ({ graphHost, graphPage, graphTask, graphTaskHost, graphTaskProbe }): Promise<void> => {
      await test.step('WHEN the over-cap state arrives and showTasks names its root', async (): Promise<void> => {
        await graphPage.open();
        await graphHost.sendState(overCapTasksState());
        await graphTaskHost.sendShowTasks([OVER_CAP_ROOT_TASK]);
      });

      await test.step('THEN the banner counts the tasks the cap cut', async (): Promise<void> =>
        graphTask.expectBanner(OVER_CAP_CUT.hiddenCount));

      await test.step('AND the cut matches the literal count', (): void =>
        expect(OVER_CAP_CUT.hiddenCount).toBe(OVER_CAP_HIDDEN_COUNT));

      await test.step('WHEN Show all tasks is pressed', async (): Promise<void> => graphTask.showAllTasks());

      await test.step('THEN the banner is gone', async (): Promise<void> => graphTask.expectBanner(null));

      await test.step('AND every reachable task is drawn', async (): Promise<void> => graphTaskProbe.expectTaskIds(overCapTaskIds()));

      await test.step('AND the reachable tasks are the literal count', (): void =>
        expect(overCapTaskIds()).toHaveLength(OVER_CAP_TASK_COUNT));
    }
  );
});
