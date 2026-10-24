import { closedPanelsSavedState } from './graph-shot-state.spec.util.ts';
import { TARGET_LIKE_CHOSEN_TASK, targetLikeTasksState } from './graph-target-like-tasks.spec.util.ts';
import { taskViewOf } from './graph-task-saved.spec.util.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import type { TaskShotSetup } from '../../common/graph-shots.type.ts';

/**
 * The target-like task state with `TARGET_LIKE_CHOSEN_TASK` (it needs `hub#build` and has six dependents) chosen and
 * selected on arrival, panels closed. The empty layout key makes the camera fit, the same on every run.
 */
export const taskShotSetup = (): TaskShotSetup => {
  const state = targetLikeTasksState();
  const closed = closedPanelsSavedState(state.hash);
  const task = taskViewOf({ chosen: [TARGET_LIKE_CHOSEN_TASK], selected: TARGET_LIKE_CHOSEN_TASK });
  const saved: GraphViewState = { ...closed, mode: 'tasks', task };
  const setup: TaskShotSetup = { state, saved };

  return setup;
};
