import { runLabelOf, stopLabelOf } from './controls-text.util.ts';
import { isLiveRun } from './task-run.util.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import { ROOT_TASK_PACKAGE } from '../common/graph-task.const.ts';
import type { TaskToolbarKind } from '../common/task-toolbar.type.ts';

/** The task toolbar's buttons, left to right. */
export const TASK_TOOLBAR_ORDER: TaskToolbarKind[] = ['run', 'showPackage', 'ellipsis'];

/** What the Run/Stop slot does now: Stop while the task is live, else Run. */
export const runActionOf = (state: GraphRunState | null): 'run' | 'stop' => {
  const isLive = isLiveRun(state);

  if (isLive) return 'stop';

  return 'run';
};

/** The Run/Stop slot's name for `action`: `Stop <id>` while it stops the task, else `Run <id>`. */
export const runSlotLabelOf = (id: string, action: 'run' | 'stop'): string => {
  if (action === 'stop') return stopLabelOf(id);

  return runLabelOf(id);
};

const isShownOf = (kind: TaskToolbarKind, task: GraphTask, state: GraphRunState | null, isCompact: boolean): boolean => {
  const hasMenu = task.isRunnable || isLiveRun(state);

  if (kind === 'ellipsis') return hasMenu;

  if (isCompact) return false;

  if (kind === 'run') return hasMenu;

  return task.packageName !== ROOT_TASK_PACKAGE;
};

/** The buttons the toolbar shows, in order: the "…" stays at a compact zoom, and only while the task menu has items. */
export const taskToolbarShownOf = (task: GraphTask, state: GraphRunState | null, isCompact: boolean): TaskToolbarKind[] => {
  const shown = TASK_TOOLBAR_ORDER.filter((kind): boolean => isShownOf(kind, task, state, isCompact));

  return shown;
};
