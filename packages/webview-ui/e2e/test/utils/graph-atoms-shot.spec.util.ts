import { closedPanelsSavedState } from './graph-shot-state.spec.util.ts';
import { TARGET_LIKE_UMBRELLA, targetLikeFileIds, targetLikeTasksState } from './graph-target-like-tasks.spec.util.ts';
import { taskViewOf } from './graph-task-saved.spec.util.ts';
import type { GraphAtomGroupState } from '../../../src/bridge/common/graph-message.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import type { TaskShotSetup } from '../../common/graph-shots.type.ts';

/** The ten files of the umbrella, in the order the group lists them. */
export const ATOMS_SHOT_FILE_IDS = targetLikeFileIds();

const [LIVE, PASSED, FAILED, CACHED, SECOND_FAILED] = ATOMS_SHOT_FILE_IDS;

/** A passed, a failed and a cached file besides the live one, so every outline colour and the dashed border are in the shot. */
const ATOMS_SHOT_FILES: GraphAtomGroupState['files'] = {
  [LIVE ?? '']: 'passed',
  [PASSED ?? '']: 'passed',
  [FAILED ?? '']: 'failed',
  [SECOND_FAILED ?? '']: 'failed',
  [CACHED ?? '']: 'cached'
};

export const ATOMS_SHOT_STATE: GraphAtomGroupState = {
  counts: '10 files · 2 passed · 2 failed · 1 cached',
  files: ATOMS_SHOT_FILES
};

/** The groups message of the shot: the umbrella's outcomes. */
export const ATOMS_SHOT_GROUPS: Readonly<Record<string, GraphAtomGroupState>> = { [TARGET_LIKE_UMBRELLA]: ATOMS_SHOT_STATE };

/**
 * The target-like task state with the umbrella chosen and selected on arrival, panels closed. The empty layout key makes
 * the camera fit, the same on every run.
 */
export const atomsShotSetup = (): TaskShotSetup => {
  const state = targetLikeTasksState();
  const closed = closedPanelsSavedState(state.hash);
  const task = taskViewOf({ chosen: [TARGET_LIKE_UMBRELLA], selected: TARGET_LIKE_UMBRELLA });
  const saved: GraphViewState = { ...closed, mode: 'tasks', task };
  const setup: TaskShotSetup = { state, saved };

  return setup;
};
