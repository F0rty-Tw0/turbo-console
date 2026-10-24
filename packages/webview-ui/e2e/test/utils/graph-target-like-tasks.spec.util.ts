import { packagesOf } from './graph-package.spec.util.ts';
import { targetLikeState } from './graph-target-like.spec.util.ts';
import { taskSavedState } from './graph-task-saved.spec.util.ts';
import type { GraphEdge, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';

const DEPENDENT_COUNT = 400;

/** The one chosen task of `overCapTasksState`; its 400 dependents put it over the 300-task cap at depth 1. */
export const OVER_CAP_ROOT_TASK = 'root#build';

const dependentOf = (index: number): GraphTask => {
  const name = `t${index + 1}`;
  const task: GraphTask = {
    id: `leaf#${name}`,
    packageName: 'leaf',
    name,
    command: name,
    isRunnable: true,
    dependencies: [OVER_CAP_ROOT_TASK]
  };

  return task;
};

const LEAF_NEEDS_ROOT: GraphEdge[] = [{ source: 'leaf', target: 'root' }];

const ROOT: GraphTask = {
  id: OVER_CAP_ROOT_TASK,
  packageName: 'root',
  name: 'build',
  command: 'build',
  isRunnable: true,
  dependencies: []
};

/** `root#build` and its 400 dependents `leaf#t1` to `leaf#t400`, one hop away, in packages `root` and `leaf`. */
export const overCapTasksState = (): GraphReady => {
  const slots = Array.from({ length: DEPENDENT_COUNT });
  const dependents = slots.map((_slot, index) => dependentOf(index));
  const state: GraphReady = {
    kind: 'graph',
    hash: '7a5c0400',
    packages: packagesOf(['leaf', 'root']),
    edges: LEAF_NEEDS_ROOT,
    positions: null,
    folderPositions: null,
    tasks: [ROOT, ...dependents]
  };

  return state;
};

/** Every task id of `overCapTasksState`. */
export const overCapTaskIds = (): string[] => overCapTasksState().tasks.map((task) => task.id);

/** The tasks every package of `targetLikeTasksState` has; `build` also needs the `build` of each package it needs. */
const OWN_TASKS: Record<string, string[]> = {
  test: ['build'],
  lint: [],
  typecheck: ['build'],
  docs: ['build'],
  pack: ['build'],
  e2e: ['test']
};

/** `lib-3#build`: it needs `hub#build` and has six dependents, so it has dependencies and dependents both. */
export const TARGET_LIKE_CHOSEN_TASK = 'lib-3#build';

/** `hub#build`: the most dependents of any task (every lib, `util-a`, `util-b`, and its own `test` / `typecheck` / `docs` / `pack`). */
export const TARGET_LIKE_HUB_TASK = 'hub#build';

const targetLikeTaskOf = (packageName: string, name: string, dependencies: string[]): GraphTask => {
  const task: GraphTask = { id: `${packageName}#${name}`, packageName, name, command: name, isRunnable: true, dependencies };

  return task;
};

const ownTasksOf = (packageName: string): GraphTask[] => {
  const names = Object.keys(OWN_TASKS);
  const taskOf = (name: string): GraphTask => {
    const needed = OWN_TASKS[name] ?? [];

    return targetLikeTaskOf(
      packageName,
      name,
      needed.map((own) => `${packageName}#${own}`)
    );
  };

  return names.map(taskOf);
};

const buildOf = (state: GraphReady, packageName: string): GraphTask => {
  const needs = state.edges.filter((edge) => edge.source === packageName);
  const dependencies = needs.map((edge) => `${edge.target}#build`);

  return targetLikeTaskOf(packageName, 'build', dependencies);
};

/**
 * `targetLikeState` with 98 tasks (`build`, `test`, `lint`, `typecheck`, `docs`, `pack`, `e2e` per package), hash `7a7a7a7b`.
 * Each `build` needs the `build` of every package its package needs. `hub#docs` needs only `hub#build`, which needs nothing,
 * and nothing needs `hub#docs`: choosing it shows two tasks joined by one lone edge.
 */
export const targetLikeTasksState = (): GraphReady => {
  const base = targetLikeState();
  const tasksOf = (pkg: GraphReady['packages'][number]): GraphTask[] => {
    const own = ownTasksOf(pkg.name);
    const build = buildOf(base, pkg.name);

    return [build, ...own];
  };
  const tasks = base.packages.flatMap(tasksOf);
  const state: GraphReady = { ...base, hash: '7a7a7a7b', tasks };

  return state;
};

/** A saved task view of `targetLikeTasksState`'s hash with `TARGET_LIKE_HUB_TASK` chosen, so the state shows its chain on arrival. */
export const targetLikeHubSavedState = (): GraphViewState => {
  const { hash } = targetLikeTasksState();

  return taskSavedState(hash, { chosen: [TARGET_LIKE_HUB_TASK] });
};
