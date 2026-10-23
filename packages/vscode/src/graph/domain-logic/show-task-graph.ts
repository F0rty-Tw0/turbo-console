import { graphRootOf } from './graph-root.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import { taskTargetOf } from '../../run/utils/run-target.util.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphOpener, RootPickPorts } from '../common/graph-panel.type.ts';
import { GRAPH_OPEN_FAILED_TEXT, SINGLE_PACKAGE_TASKS_TEXT, TASK_PICK_PLACEHOLDER } from '../common/graph.const.ts';
import { taskGraphItemsOf } from '../utils/graph-task-items.util.ts';
import { graphTasksOf } from '../utils/graph-tasks.util.ts';

type ShowTaskGraphDeps = {
  readonly roots: Roots;
  readonly ports: RootPickPorts;
  readonly panels: Pick<GraphOpener, 'open'>;
};

/** The panel to open and the tasks to ask it for; no `taskIds` opens the panel alone. */
type TaskGraphRequest = {
  readonly root: string;
  readonly taskIds: string[];
};

const rowRequestOf = (arg: unknown): TaskGraphRequest | null => {
  const target = taskTargetOf(arg);

  if (target === null) return null;

  const request: TaskGraphRequest = { root: target.definition.root, taskIds: [target.definition.id] };

  return request;
};

const pickedRequestOf = async ({ roots, ports }: ShowTaskGraphDeps): Promise<TaskGraphRequest | null> => {
  const root = await graphRootOf(roots, ports);

  if (root === null) return null;

  await roots.get(root)?.coordinator.ensureLoaded();

  const model = roots.get(root)?.state.model;

  if (model === null || model === undefined) {
    const panelOnly: TaskGraphRequest = { root, taskIds: [] };

    return panelOnly;
  }

  if (model.singlePackage) {
    ports.info(SINGLE_PACKAGE_TASKS_TEXT);

    return null;
  }

  const items = taskGraphItemsOf(graphTasksOf(model), root);
  const taskIds = await ports.pickMany(items, TASK_PICK_PLACEHOLDER);

  if (taskIds === undefined || taskIds.length === 0) return null;

  const request: TaskGraphRequest = { root, taskIds };

  return request;
};

const openWith = ({ root, taskIds }: TaskGraphRequest, { panels, ports }: ShowTaskGraphDeps): void => {
  try {
    const panel = panels.open(root);

    if (taskIds.length > 0) panel?.session.showTasks(taskIds);
  } catch (error: unknown) {
    ports.log(logTextOf(error));
    ports.error(GRAPH_OPEN_FAILED_TEXT);
  }
};

/**
 * `turboConsole.showTaskGraph`: a task row opens its root's graph on that task with no question; otherwise the user picks
 * tasks of the resolved root. A single-package root is told it has no task graph, a cancelled or empty pick opens nothing,
 * and a root with no model opens the panel alone so its error screen shows. A panel that cannot be opened is logged and the
 * user told to see Output.
 */
export const showTaskGraph = async (arg: unknown, deps: ShowTaskGraphDeps): Promise<void> => {
  const row = rowRequestOf(arg);
  const request = row ?? (await pickedRequestOf(deps));

  if (request === null) return;

  openWith(request, deps);
};
