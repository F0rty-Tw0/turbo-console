import type { GraphIconId } from './graph-icon.type.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';

/** The most tasks task mode draws before it cuts dependent and dependency hops. */
export const TASK_CAP = 300;

export const MIN_TASK_DEPTH = 0;

export const MAX_TASK_DEPTH = 5;

export const DEFAULT_TASK_DEPTH = 1;

/** Starts every package compound id of the task graph; package names hold no `:`, so no task id starts this way. */
export const TASK_BOX_PREFIX = 'pkg:';

/** The class of every task node, so a walk of the task graph skips the package compounds. */
export const TASK_NODE_CLASS = 'task';

/** The `main.graph-page` class while task mode is on; CSS hides the package Controls panel and the package widgets by it. */
export const TASK_MODE_CLASS = 'task-mode';

/** The id of the task mode Controls panel, which the Controls button points at while task mode is on. */
export const TASK_CONTROLS_ID = 'graph-task-controls';

export const MODE_LABEL = 'Mode';

export const TASK_MODE_LABEL = 'Task mode';

export const SHOW_ALL_TASKS_LABEL = 'Show all tasks';

export const SEARCH_TASKS_LABEL = 'Search tasks';

export const DEPENDENTS_DEPTH_LABEL = 'Dependents depth';

/** The package action that opens task mode on a package's tasks. */
export const SHOW_TASKS_LABEL = 'Show tasks';

/** The notice when every requested task id matches no task. */
export const UNKNOWN_TASKS_TEXT = 'Those tasks are not in this workspace';

/** The prompt while nothing is chosen. */
export const EMPTY_TASKS_TEXT =
  'Choose tasks to show: select a package and pick Show tasks, use Show in task graph on the details page, or run Turbo Console: Show Task Graph…';

/** The id of the task details panel, which the Details button points at while task mode is on. */
export const TASK_DETAILS_ID = 'graph-task-details';

/** Starts each run state class on a task node: `run-running`, `run-passed`, `run-failed`, `run-stopped`, `run-failed-to-start`. */
export const RUN_CLASS_PREFIX = 'run-';

export const RUN_LABEL = 'Run';

export const RUN_NO_CACHE_LABEL = 'Run without cache';

export const STOP_LABEL = 'Stop';

export const DEPENDENCIES_LABEL = 'Dependencies';

/** The command line of a task whose package script is missing. */
export const NO_COMMAND_TEXT = 'No command';

/** The word the task panel shows beside each run state's icon. */
export const RUN_STATE_TEXT: Readonly<Record<GraphRunState, string>> = {
  running: 'Running',
  passed: 'Passed',
  failed: 'Failed',
  stopped: 'Stopped',
  'failed-to-start': 'Failed to start'
};

/** The Codicon of each run state, as the Tasks tree draws it. */
export const RUN_STATE_ICONS: Readonly<Record<GraphRunState, GraphIconId>> = {
  running: 'sync',
  passed: 'pass',
  failed: 'error',
  stopped: 'debug-stop',
  'failed-to-start': 'error'
};
