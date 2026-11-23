import { tenKNameOf, tenKPackageStateOf } from './graph-10k.spec.util.ts';
import { indexesOf } from './graph-large.spec.util.ts';
import { taskSavedState } from './graph-task-saved.spec.util.ts';
import type { GraphEdge, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';

/** 2000 packages of five tasks each: 10,000 tasks. */
const TASK_PACKAGE_COUNT = 2000;

const TASKS_HASH = 'a10c0002';

/** The tasks every package has besides `build`, with the package's own tasks each needs. */
const OWN_TASKS: Record<string, string[]> = { test: ['build'], lint: [], typecheck: ['build'], docs: ['build'] };

const taskOf = (packageName: string, name: string, dependencies: string[]): GraphTask => {
  const task: GraphTask = {
    id: `${packageName}#${name}`,
    packageName,
    name,
    command: name,
    isRunnable: true,
    isTurboTask: true,
    dependencies
  };

  return task;
};

/** `build` needing the `build` of every package its package needs, then `test`, `lint`, `typecheck` and `docs`. */
const tasksOfPackage = (edges: GraphEdge[], index: number): GraphTask[] => {
  const packageName = tenKNameOf(index);
  const needs = edges.filter((edge): boolean => edge.source === packageName);
  const builds = needs.map((edge): string => `${edge.target}#build`);
  const build = taskOf(packageName, 'build', builds);
  const ownOf = ([name, needed]: [string, string[]]): GraphTask => {
    const dependencies = needed.map((own): string => `${packageName}#${own}`);

    return taskOf(packageName, name, dependencies);
  };
  const own = Object.entries(OWN_TASKS).map(ownOf);

  return [build, ...own];
};

/** 2000 packages of `tenKPackagesState`'s shape with five tasks each: 10,000 tasks, uncached. */
export const tenKTasksState = (): GraphReady => {
  const packages = tenKPackageStateOf(TASK_PACKAGE_COUNT, TASKS_HASH);
  const indexes = indexesOf(TASK_PACKAGE_COUNT);
  const tasks = indexes.flatMap((index): GraphTask[] => tasksOfPackage(packages.edges, index));
  const state: GraphReady = { ...packages, tasks };

  return state;
};

/** A saved task view of `tenKTasksState` with every task chosen and the cap lifted (Show every task). */
export const tenKTasksSavedState = (): GraphViewState => {
  const { tasks } = tenKTasksState();
  const chosen = tasks.map((task): string => task.id);

  return taskSavedState(TASKS_HASH, { chosen, capLifted: true });
};
