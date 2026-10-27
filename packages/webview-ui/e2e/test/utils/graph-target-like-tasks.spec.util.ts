import { packagesOf } from './graph-package.spec.util.ts';
import { targetLikeState } from './graph-target-like.spec.util.ts';
import { taskSavedState } from './graph-task-saved.spec.util.ts';
import type { GraphAtomFile, GraphAtomGroup, GraphEdge, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';
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
    singlePackage: false,
    rootLabel: null,
    hash: '7a5c0400',
    packages: packagesOf(['leaf', 'root']),
    edges: LEAF_NEEDS_ROOT,
    positions: null,
    folderPositions: null,
    tasks: [ROOT, ...dependents],
    atomGroups: []
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

/** The Atomizer umbrella of `targetLikeTasksState`: `app-1#e2e-ci`, which needs the `build` of `feat-1` and `feat-2`. */
export const TARGET_LIKE_UMBRELLA = 'app-1#e2e-ci';

const UMBRELLA_DEPENDENCIES = ['feat-1#build', 'feat-2#build'];

/** The spec path of file `position` (0-based), repo-gen's shape: the first is the one live file, `tests/spec-001.live.spec.ts`. */
const specPathOf = (position: number): string => {
  const id = String(position + 1).padStart(3, '0');
  const suffix = position === 0 ? '.live.spec.ts' : '.spec.ts';

  return `tests/spec-${id}${suffix}`;
};

const atomFileOf = (position: number): GraphAtomFile => {
  const specPath = specPathOf(position);
  const file: GraphAtomFile = { id: `${TARGET_LIKE_UMBRELLA}--${specPath}`, specPath, isLive: position === 0 };

  return file;
};

const umbrellaGroupOf = (fileCount: number): GraphAtomGroup => {
  const slots = Array.from({ length: fileCount });
  const files = slots.map((_slot, position) => atomFileOf(position));
  const group: GraphAtomGroup = { umbrellaId: TARGET_LIKE_UMBRELLA, files };

  return group;
};

/** The task ids of the umbrella's first `fileCount` files, the first the live one. */
export const targetLikeFileIds = (fileCount = 10): string[] => {
  const group = umbrellaGroupOf(fileCount);

  return group.files.map((file) => file.id);
};

/**
 * `targetLikeState` with 99 tasks (`build`, `test`, `lint`, `typecheck`, `docs`, `pack`, `e2e` per package, and the
 * umbrella `app-1#e2e-ci`), hash `7a7a7a7b`, and the umbrella's group of `fileCount` files, the first live.
 * Each `build` needs the `build` of every package its package needs. `hub#docs` needs only `hub#build`, which needs nothing,
 * and nothing needs `hub#docs`: choosing it shows two tasks joined by one lone edge.
 */
export const targetLikeTasksState = (fileCount = 10): GraphReady => {
  const base = targetLikeState();
  const tasksOf = (pkg: GraphReady['packages'][number]): GraphTask[] => {
    const own = ownTasksOf(pkg.name);
    const build = buildOf(base, pkg.name);

    return [build, ...own];
  };
  const packageTasks = base.packages.flatMap(tasksOf);
  const umbrella = targetLikeTaskOf('app-1', 'e2e-ci', UMBRELLA_DEPENDENCIES);
  const tasks = [...packageTasks, umbrella];
  const atomGroups = [umbrellaGroupOf(fileCount)];
  const state: GraphReady = { ...base, hash: '7a7a7a7b', tasks, atomGroups };

  return state;
};

/** A saved task view of `targetLikeTasksState`'s hash with `TARGET_LIKE_HUB_TASK` chosen, so the state shows its chain on arrival. */
export const targetLikeHubSavedState = (): GraphViewState => {
  const { hash } = targetLikeTasksState();

  return taskSavedState(hash, { chosen: [TARGET_LIKE_HUB_TASK] });
};
