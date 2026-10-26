import type { RunStateIconId } from './graph-icon.type.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';

/** The most tasks task mode draws before it cuts dependent and dependency hops. */
export const TASK_CAP = 300;

/** How many task layouts page memory keeps by key; the one shown least recently goes first. */
export const TASK_LAYOUT_MEMORY = 20;

export const MIN_TASK_DEPTH = 0;

export const MAX_TASK_DEPTH = 5;

export const DEFAULT_TASK_DEPTH = 1;

/** Starts every package compound id of the task graph; package names hold no `:`, so no task id starts this way. */
export const TASK_BOX_PREFIX = 'pkg:';

/** The class of every package compound of the task graph, which draws its package name on the page; folder boxes have DOM header rows instead. */
export const TASK_BOX_CLASS = 'task-box';

/** A task-mode package box's frame dashes: 4 px on, 4 px off. */
export const TASK_BOX_DASH_PX: number[] = [4, 4];

/** The class of every task node, so a walk of the task graph skips the package compounds. */
export const TASK_NODE_CLASS = 'task';

/** The class of every task graph edge, so the flow overlay never reads a package graph edge still on the core. */
export const TASK_LINK_CLASS = 'task-link';

/** The `main.graph-page` class while task mode is on; CSS hides the package Controls panel and the package widgets by it. */
export const TASK_MODE_CLASS = 'task-mode';

/** The class of the selected task's "…", which task mode keeps while it hides the package "…". */
export const TASK_WIDGET_CLASS = 'task-widget-button';

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

/** How long a task notice shown in package mode stays, since no task render comes to replace it. */
export const PACKAGE_NOTICE_MS = 8000;

/** The prompt while nothing is chosen. */
export const EMPTY_TASKS_TEXT =
  'Choose tasks to show: select a package and pick Show tasks, use Show in task graph on the details page, or run Turbo Console: Show Task Graph…';

/** The id of the task details panel, which the Details button points at while task mode is on. */
export const TASK_DETAILS_ID = 'graph-task-details';

/** The task details panel's lead while no task is selected. */
export const TASK_EMPTY_LEAD_TEXT = 'Select a task to see its command, dependencies and run actions here.';

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
export const RUN_STATE_ICONS: Readonly<Record<GraphRunState, RunStateIconId>> = {
  running: 'sync',
  passed: 'pass',
  failed: 'error',
  stopped: 'debug-stop',
  'failed-to-start': 'error'
};
