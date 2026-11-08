import type { RunStateIconId } from './graph-icon.type.ts';
import type { TaskOwners } from './task-details.type.ts';
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

/** Starts the id of a titled-row box's title placeholder leaf; no task id starts this way. */
export const TITLE_SLOT_PREFIX = 'title-slot:';

/** Starts the id of the edge that ties a titled-row box's placeholder to its task. */
export const TITLE_TIE_PREFIX = 'title-tie:';

/** A titled-row box's ELK padding: a thin top, since its title sits in the placeholder row, 32 px on the other sides. */
export const TITLED_ROW_PADDING = '[top=8,left=32,bottom=32,right=32]';

/** The class of every package compound of the task graph, which draws its package name on the page; folder boxes have DOM header rows instead. */
export const TASK_BOX_CLASS = 'task-box';

/**
 * The px a task box title takes past its rounded-up text width: Cytoscape keeps an ellipsis label whole only while its
 * rounded-up width is under `text-max-width`.
 */
export const TITLE_WHOLE_SLACK_PX = 1;

/** A task-mode package box's frame dashes: 4 px on, 4 px off. */
export const TASK_BOX_DASH_PX: number[] = [4, 4];

/** Starts the id of the compound that holds a package's script tasks inside its package box; no task id starts this way. */
export const SCRIPTS_BOX_PREFIX = 'scripts:';

/** The class of every Scripts compound of the task graph. */
export const SCRIPTS_BOX_CLASS = 'task-scripts';

/** The title of every Scripts compound. */
export const SCRIPTS_BOX_TITLE = 'Scripts';

/** A Scripts box's frame dashes, 2 px on, 3 px off, so it reads apart from its package box's dashes. */
export const SCRIPTS_BOX_DASH_PX: number[] = [2, 3];

/** The class of every task-mode folder box, which draws its folder title on the canvas: task mode has no DOM header rows. */
export const TASK_FOLDER_CLASS = 'task-folder';

/** The title of the root `//` tasks, on its box and wherever a root task names its owner. */
export const ROOT_TASKS_TITLE = 'Workspace root (//)';

/** The empty map of labels, folders or any other names a caller does not hold. */
export const NO_NAMES: ReadonlyMap<string, string> = new Map();

/** The class of every task node, so a walk of the task graph skips the package compounds. */
export const TASK_NODE_CLASS = 'task';

/** The class of every task graph edge, so the flow overlay never reads a package graph edge still on the core. */
export const TASK_LINK_CLASS = 'task-link';

/** The `main.graph-page` class while task mode is on; CSS hides the package Controls panel and the package widgets by it. */
export const TASK_MODE_CLASS = 'task-mode';

/** The id of the task mode Controls panel, which the Controls button points at while task mode is on. */
export const TASK_CONTROLS_ID = 'graph-task-controls';

export const MODE_LABEL = 'Mode';

export const PACKAGES_MODE_LABEL = 'Packages';

export const PACKAGES_MODE_TITLE = 'Show the package graph';

export const TASKS_MODE_LABEL = 'Tasks';

export const TASKS_MODE_TITLE = 'Show the task graph';

export const SHOW_ALL_TASKS_LABEL = 'Show all tasks';

export const SEARCH_TASKS_LABEL = 'Search tasks';

export const DEPENDENTS_DEPTH_LABEL = 'Dependents depth';

export const DEPENDENTS_DEPTH_HINT = 'How many levels of tasks that depend on the chosen tasks are shown.';

export const DEPENDENTS_DEPTH_HINT_ID = 'graph-task-depth-hint';

/** The package action that opens task mode on a package's tasks. */
export const SHOW_TASKS_LABEL = 'Show tasks';

export const SHOW_SCRIPTS_LABEL = 'Show scripts';

/** The notice when every requested task id matches no task. */
export const UNKNOWN_TASKS_TEXT = 'Those tasks are not in this workspace';

/** How long a task notice shown in package mode stays, since no task render comes to replace it. */
export const PACKAGE_NOTICE_MS = 8000;

/** How long the notice line is shown empty before its text is written, so a screen reader has the `role=status` line in the accessibility tree and announces the text as a change. */
export const NOTICE_TEXT_DELAY_MS = 100;

/** The prompt while nothing is chosen. */
export const EMPTY_TASKS_TEXT =
  'Choose tasks to show: select a package and pick Show tasks, use Show in task graph on the details page, or run Turbo Console: Show Task Graph…';

/** The prompt button that chooses every known task; its text ends with their count. */
export const SHOW_EVERY_TASK_LABEL = 'Show every task';

/** The prompt line under Show every task while more than `TASK_CAP` tasks are known. */
export const SLOW_TASKS_TEXT = `Drawing more than ${TASK_CAP} tasks can be slow.`;

/** The id of the task details panel, which the Details button points at while task mode is on. */
export const TASK_DETAILS_ID = 'graph-task-details';

/** The task details panel's lead while no task is selected. */
export const TASK_EMPTY_LEAD_TEXT = 'Select a task to see its command, dependencies and run actions here.';

/** Starts each run state class on a task, package or collapsed folder node:`run-running`, `run-continuous`, `run-passed`, `run-failed`, `run-stopped`, `run-failed-to-start`. */
export const RUN_CLASS_PREFIX = 'run-';

/** The package and collapsed folder run state: the first of these any of its tasks has. `continuous` ranks just below `running`. */
export const RUN_PRECEDENCE: GraphRunState[] = ['running', 'continuous', 'failed', 'failed-to-start', 'stopped', 'passed'];

/** Set with `run-<state>` on a package or collapsed folder node only, so a rule can tell them from tasks (spec D14). */
export const PACKAGE_RUN_CLASS = 'package-run';

export const RUN_LABEL = 'Run';

export const RUN_NO_CACHE_LABEL = 'Run without cache';

export const STOP_LABEL = 'Stop';

export const DEPENDENCIES_LABEL = 'Dependencies';

export const DEPENDENTS_LABEL = 'Dependents';

/** The Dependents section's line while no shown task depends on the selected one. */
export const NONE_SHOWN_TEXT = 'None shown';

/** The package of a task of the workspace root, which the package graph never draws. */
export const ROOT_TASK_PACKAGE = '//';

/** The command line of a task whose package script is missing. */
export const NO_COMMAND_TEXT = 'No command';

/** The `owners` of a `runs` message that has none: every task runs on its own. */
export const NO_OWNERS: TaskOwners = {};

/** The word the task panel shows beside each run state's icon. */
export const RUN_STATE_TEXT: Readonly<Record<GraphRunState, string>> = {
  running: 'Running',
  continuous: 'Continuous',
  passed: 'Passed',
  failed: 'Failed',
  stopped: 'Stopped',
  'failed-to-start': 'Failed to start'
};

/** The Codicon of each run state, as the Tasks tree draws it. */
export const RUN_STATE_ICONS: Readonly<Record<GraphRunState, RunStateIconId>> = {
  running: 'sync',
  continuous: 'pulse',
  passed: 'pass',
  failed: 'error',
  stopped: 'debug-stop',
  'failed-to-start': 'error'
};
