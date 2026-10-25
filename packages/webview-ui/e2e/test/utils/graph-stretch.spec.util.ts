import { indexesOf, largeState, nameOf } from './graph-large.spec.util.ts';
import { taskSavedState } from './graph-task-saved.spec.util.ts';
import type { GraphAtomFile, GraphAtomGroup, GraphEdge, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import { LARGE_PACKAGE_COUNT } from '../../common/graph.const.ts';

/** Every 15th package of the 300 owns an Atomizer umbrella: 20 groups. */
const UMBRELLA_STRIDE = 15;

const FILES_PER_GROUP = 200;

/** Every 10th file of a group is live. */
const LIVE_STRIDE = 10;

const STRETCH_HASH = '57e7c300';

/** The tasks every package has besides `build` and its fifth task; each needs the package's own tasks listed. */
const OWN_TASKS: Record<string, string[]> = { test: ['build'], lint: [], typecheck: ['build'] };

const taskOf = (packageName: string, name: string, dependencies: string[]): GraphTask => {
  const task: GraphTask = { id: `${packageName}#${name}`, packageName, name, command: name, isRunnable: true, dependencies };

  return task;
};

const hasUmbrella = (index: number): boolean => index % UMBRELLA_STRIDE === 0;

const umbrellaIdOf = (index: number): string => `${nameOf(index)}#e2e-ci`;

const isLiveAt = (position: number): boolean => (position + 1) % LIVE_STRIDE === 0;

/** The spec path of file `position` (0-based), repo-gen's shape: every 10th is live, `tests/spec-010.live.spec.ts`. */
const specPathOf = (position: number): string => {
  const id = String(position + 1).padStart(3, '0');
  const suffix = isLiveAt(position) ? '.live.spec.ts' : '.spec.ts';

  return `tests/spec-${id}${suffix}`;
};

const fileOf = (umbrellaId: string, position: number): GraphAtomFile => {
  const specPath = specPathOf(position);
  const file: GraphAtomFile = { id: `${umbrellaId}--${specPath}`, specPath, isLive: isLiveAt(position) };

  return file;
};

const groupOf = (index: number): GraphAtomGroup => {
  const umbrellaId = umbrellaIdOf(index);
  const positions = indexesOf(FILES_PER_GROUP);
  const files = positions.map((position) => fileOf(umbrellaId, position));
  const group: GraphAtomGroup = { umbrellaId, files };

  return group;
};

const buildOf = (edges: GraphEdge[], index: number): GraphTask => {
  const packageName = nameOf(index);
  const needs = edges.filter((edge) => edge.source === packageName);
  const dependencies = needs.map((edge) => `${edge.target}#build`);

  return taskOf(packageName, 'build', dependencies);
};

/** `e2e-ci` (the umbrella, needing the package `build`) in every 15th package, `docs` elsewhere. */
const fifthTaskOf = (index: number): GraphTask => {
  const packageName = nameOf(index);
  const dependencies = [`${packageName}#build`];
  const name = hasUmbrella(index) ? 'e2e-ci' : 'docs';

  return taskOf(packageName, name, dependencies);
};

const ownTaskOf = (index: number, name: string): GraphTask => {
  const packageName = nameOf(index);
  const needed = OWN_TASKS[name] ?? [];
  const dependencies = needed.map((own) => `${packageName}#${own}`);

  return taskOf(packageName, name, dependencies);
};

const tasksOfPackage = (edges: GraphEdge[], index: number): GraphTask[] => {
  const own = Object.keys(OWN_TASKS).map((name) => ownTaskOf(index, name));
  const build = buildOf(edges, index);
  const fifth = fifthTaskOf(index);

  return [build, ...own, fifth];
};

const UMBRELLA_INDEXES = indexesOf(LARGE_PACKAGE_COUNT).filter(hasUmbrella);

/** The 20 umbrella task ids of `stretchTasksState`, in group order: `pkg-000#e2e-ci`, `pkg-015#e2e-ci`, and so on. */
export const STRETCH_UMBRELLAS: string[] = UMBRELLA_INDEXES.map(umbrellaIdOf);

/**
 * `largeState`'s 300 packages and edges as 1500 tasks (`build`, `test`, `lint`, `typecheck` and `e2e-ci` or `docs` per package)
 * with 20 umbrellas of 200 files each, every 10th live, hash `57e7c300`. Each `build` needs the `build` of every package its package needs.
 */
export const stretchTasksState = (): GraphReady => {
  const large = largeState();
  const indexes = indexesOf(LARGE_PACKAGE_COUNT);
  const tasks = indexes.flatMap((index) => tasksOfPackage(large.edges, index));
  const atomGroups = UMBRELLA_INDEXES.map(groupOf);
  const state: GraphReady = { ...large, hash: STRETCH_HASH, positions: null, tasks, atomGroups };

  return state;
};

/** A saved task view of `stretchTasksState`'s hash with every task chosen and the cap lifted, so the whole graph shows on arrival. */
export const stretchSavedState = (): GraphViewState => {
  const { hash, tasks } = stretchTasksState();
  const chosen = tasks.map((task) => task.id);

  return taskSavedState(hash, { chosen, capLifted: true });
};
