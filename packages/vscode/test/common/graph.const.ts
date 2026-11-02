/** The command that opens a root's Package Graph panel, or reveals the one that is open. */
export const GRAPH_COMMAND = 'turboConsole.openPackageGraph';

/** The workspace package the model adds for the repo root; the fixture manifest does not list it. */
export const ROOT_PACKAGE_NAME = '//';

/** The root task the `fixture-root-task` workspace adds: a `scripts` entry in the root `package.json` and a `//#rootgen` task in the root `turbo.json`. */
export const ROOT_TASK_NAME = 'rootgen';

/** The id turbo gives the root task `ROOT_TASK_NAME`. */
export const ROOT_TASK_ID = `${ROOT_PACKAGE_NAME}#${ROOT_TASK_NAME}`;

/** The tag the fixture manifest gives the hub package; the page receives it with that package. */
export const HUB_TAG = 'fx:hub';

/** A graph hash as the host makes it: eight lower-case hex digits. */
export const HASH_PATTERN = /^[0-9a-f]{8}$/;

/** The package whose task the task-mode cases show and run; the fixture gives it a `build` that turbo runs for real. */
export const TASK_PACKAGE = '@fx/pkg-001';

/** The id of the task the task-mode cases show and run. */
export const TASK_ID = `${TASK_PACKAGE}#build`;

/** The command that shows tasks in a root's graph panel, from a task row or a pick. */
export const TASK_GRAPH_COMMAND = 'turboConsole.showTaskGraph';

/** The command that focuses one package in a root's graph panel, from a package row or the Details header. */
export const FOCUS_COMMAND = 'turboConsole.focusPackageInGraph';

/** The command that shows every task of a root in its graph panel. */
export const ALL_TASKS_COMMAND = 'turboConsole.showAllTaskGraphs';
