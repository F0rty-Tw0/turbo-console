import type { RootState, Roots } from '../../roots/common/coordinator.type.ts';
import { isOfferedTask } from '../../tree/utils/task-filter.util.ts';
import { NO_TASKS_TEXT, PACKAGE_PLACEHOLDER, TASK_PLACEHOLDER } from '../common/picker.const.ts';
import type { NamedTask, PickItem, PickerPorts } from '../common/picker.type.ts';
import type { RunDefinition, RunRequest, TaskTarget } from '../common/run.type.ts';
import { packageItems, taskNameItems } from '../utils/picker-items.util.ts';
import { runRequestOf } from '../utils/run-target.util.ts';

const statesOf = (roots: Roots): RootState[] => roots.all().map((entry) => entry.state);

const loadAll = async (roots: Roots, ports: PickerPorts): Promise<void> => {
  const loads = statesOf(roots).map(async (state) => ports.ensureLoaded(state.folder.root));

  await Promise.all(loads);
};

/** The run of `target` in the current state of its root; `null` when the root, the task or the scripts toggle has gone. */
const requestByName = (roots: Roots, target: NamedTask, scriptsShown: boolean): RunRequest | null => {
  const state = roots.get(target.root)?.state;
  const pkg = state?.model?.packages.find((node) => node.name === target.packageName);
  const offered = pkg?.tasks.filter((node) => isOfferedTask(node, scriptsShown));
  const task = offered?.find((node) => node.name === target.taskName);

  if (task === undefined) return null;

  const definition: RunDefinition = { root: target.root, id: task.id };
  const runTarget: TaskTarget = { definition, packageName: target.packageName };

  return runRequestOf(runTarget, state, false);
};

export const runNamed = async (roots: Roots, ports: PickerPorts, target: NamedTask): Promise<void> => {
  const request = requestByName(roots, target, ports.scriptsShown());

  if (request !== null) await ports.run(request);
};

const packagesOf = (roots: Roots, task: PickItem, scriptsShown: boolean): PickItem[] => {
  const state = roots.get(task.root)?.state;

  if (state === undefined) return [];

  return packageItems(state, task.value, scriptsShown);
};

/**
 * Spec §4.6.1: loads every root, picks a task name, then a package of that root holding it, then runs it. A pick that
 * is closed ends the flow; so does a task that left the model meanwhile.
 */
export const pickAndRun = async (roots: Roots, ports: PickerPorts): Promise<void> => {
  await loadAll(roots, ports);

  const scriptsShown = ports.scriptsShown();
  const names = taskNameItems(statesOf(roots), scriptsShown);

  if (names.length === 0) {
    ports.info(NO_TASKS_TEXT);

    return;
  }

  const task = await ports.pick(names, TASK_PLACEHOLDER);

  if (task === undefined) return;

  const packages = packagesOf(roots, task, scriptsShown);

  if (packages.length === 0) return;

  const pkg = await ports.pick(packages, PACKAGE_PLACEHOLDER);

  if (pkg === undefined) return;

  const target: NamedTask = { root: task.root, packageName: pkg.value, taskName: task.value };

  await runNamed(roots, ports, target);
};
