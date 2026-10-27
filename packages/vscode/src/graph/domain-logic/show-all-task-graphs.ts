import { TASK_CAP } from '@turbo-console/webview-ui';

import { chosenRequestOf, openWith } from './show-task-graph.ts';
import type { RootPickPorts, ShowTaskGraphDeps, TaskChoice } from '../common/graph-panel.type.ts';
import { PICK_TASKS_LABEL, TASK_PICK_PLACEHOLDER } from '../common/graph.const.ts';
import { manyTasksTextOf, showAllLabelOf } from '../utils/task-choice-text.util.ts';

/**
 * Every task of the root, in item order. Past `TASK_CAP` the user is warned and chooses: all of them, a pick of
 * them (the Show Task Graph picker), or nothing when the warning is dismissed.
 */
const allChoiceOf = (ports: RootPickPorts): TaskChoice => {
  const choose: TaskChoice = async (items) => {
    const values = items.map((item) => item.value);

    if (items.length <= TASK_CAP) return values;

    const showAllLabel = showAllLabelOf(items.length);
    const answer = await ports.warn(manyTasksTextOf(items.length), [showAllLabel, PICK_TASKS_LABEL]);

    if (answer === showAllLabel) return values;

    if (answer === PICK_TASKS_LABEL) return ports.pickMany(items, TASK_PICK_PLACEHOLDER);

    return undefined;
  };

  return choose;
};

/**
 * `turboConsole.showAllTaskGraphs`: opens the resolved root's graph on every task, with the single-package, no-model and
 * no-root outcomes of Show Task Graph (`chosenRequestOf`).
 */
export const showAllTaskGraphs = async (deps: ShowTaskGraphDeps): Promise<void> => {
  const request = await chosenRequestOf(deps, allChoiceOf(deps.ports));

  if (request !== null) openWith(request, deps);
};
