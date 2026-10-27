import { graphRootOf } from './graph-root.ts';
import { taskTargetOf } from '../../run/utils/run-target.util.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { RootPickPorts, ShowTaskGraphDeps, TaskChoice, TaskGraphRequest } from '../common/graph-panel.type.ts';
import { GRAPH_OPEN_FAILED_TEXT, TASK_PICK_PLACEHOLDER } from '../common/graph.const.ts';
import { rootLabelOf } from '../utils/graph-state.util.ts';
import { taskGraphItemsOf } from '../utils/graph-task-items.util.ts';
import { graphTasksOf } from '../utils/graph-tasks.util.ts';

const rowRequestOf = (arg: unknown): TaskGraphRequest | null => {
  const target = taskTargetOf(arg);

  if (target === null) return null;

  const request: TaskGraphRequest = { root: target.definition.root, taskIds: [target.definition.id] };

  return request;
};

const pickChoiceOf = (ports: RootPickPorts): TaskChoice => {
  const choose: TaskChoice = async (items) => ports.pickMany(items, TASK_PICK_PLACEHOLDER);

  return choose;
};

/**
 * The request of a command that asks for tasks: the resolved root, its model loaded, then `choose` over the task items.
 * No model opens the panel alone; a cancelled or an empty choice opens nothing (`null`).
 */
export const chosenRequestOf = async ({ roots, ports }: ShowTaskGraphDeps, choose: TaskChoice): Promise<TaskGraphRequest | null> => {
  const root = await graphRootOf(roots, ports);

  if (root === null) return null;

  await roots.get(root)?.coordinator.ensureLoaded();

  const model = roots.get(root)?.state.model;

  if (model === null || model === undefined) {
    const panelOnly: TaskGraphRequest = { root, taskIds: [] };

    return panelOnly;
  }

  const tasks = graphTasksOf(model);
  const rootLabel = rootLabelOf(model);
  const items = taskGraphItemsOf(tasks, root, rootLabel);
  const taskIds = await choose(items);

  if (taskIds === undefined || taskIds.length === 0) return null;

  const request: TaskGraphRequest = { root, taskIds };

  return request;
};

export const openWith = ({ root, taskIds }: TaskGraphRequest, { panels, ports }: ShowTaskGraphDeps): void => {
  try {
    const panel = panels.open(root);

    if (taskIds.length > 0) panel?.session.show({ type: 'showTasks', taskIds });
  } catch (error: unknown) {
    ports.log(logTextOf(error));
    ports.error(GRAPH_OPEN_FAILED_TEXT);
  }
};

/**
 * `turboConsole.showTaskGraph`: a task row opens its root's graph on that task with no question; otherwise the user picks
 * tasks of the resolved root, a single-package root included. A cancelled or empty pick opens nothing, and a root with no
 * model opens the panel alone so its error screen shows. A panel that cannot be opened is logged and the user told to see Output.
 */
export const showTaskGraph = async (arg: unknown, deps: ShowTaskGraphDeps): Promise<void> => {
  const row = rowRequestOf(arg);

  if (row === null) {
    const picked = await chosenRequestOf(deps, pickChoiceOf(deps.ports));

    if (picked !== null) openWith(picked, deps);

    return;
  }

  openWith(row, deps);
};
