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
