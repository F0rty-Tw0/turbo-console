/** The most tasks task mode draws before it cuts dependent and dependency hops. */
export const TASK_CAP = 300;

export const MIN_TASK_DEPTH = 0;

export const MAX_TASK_DEPTH = 5;

export const DEFAULT_TASK_DEPTH = 1;

/** Starts every package compound id of the task graph; package names hold no `:`, so no task id starts this way. */
export const TASK_BOX_PREFIX = 'pkg:';

/** The class of every task node, so a walk of the task graph skips the package compounds. */
export const TASK_NODE_CLASS = 'task';
