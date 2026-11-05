import type { AtomFile, AtomGroup, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphAtomFile, GraphAtomGroup, GraphRunState, GraphRunsMessage, GraphState, GraphTask } from '@turbo-console/webview-ui';

import { atomFoldOf } from './graph-atoms.util.ts';
import type { DisplayedRun } from '../../run/common/run-progress.type.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { displayRunOf } from '../../run/utils/run-display.util.ts';
import { isRunnableTask, isVisibleTask } from '../../tree/utils/task-filter.util.ts';
import type { AtomFold, GraphListing } from '../common/graph-atom.type.ts';
import type { RunSources } from '../common/graph.type.ts';

type VisibleTask = { readonly packageName: string; readonly task: TaskNode; readonly isRootTask: boolean };

/** Default string order, so the same ids sort the same on every machine. */
const compareId = (left: string, right: string): number => Number(left > right) - Number(left < right);

const visibleOf = (pkg: PackageNode, isRootTask: boolean): VisibleTask[] => {
  const tasks = pkg.tasks.filter(isVisibleTask);

  return tasks.map((task) => {
    const visible: VisibleTask = { packageName: pkg.name, task, isRootTask };

    return visible;
  });
};

const rootTasksOf = ({ rootPackage }: WorkspaceModel): VisibleTask[] => {
  if (rootPackage === null) return [];

  return visibleOf(rootPackage, true);
};

const visibleTasksOf = (model: WorkspaceModel): VisibleTask[] => {
  const own = model.packages.flatMap((pkg) => visibleOf(pkg, false));
  const root = rootTasksOf(model);

  return [...own, ...root];
};

/** The ids a running word shows as `continuous`: the visible tasks the model marks persistent. */
export const persistentIdsOf = (model: WorkspaceModel): ReadonlySet<string> => {
  const persistent = visibleTasksOf(model).filter(({ task }) => task.persistent);
  const ids = persistent.map(({ task }) => task.id);

  return new Set(ids);
};

const NO_IDS: string[] = [];

const taskOf = ({ packageName, task, isRootTask }: VisibleTask, listed: ReadonlySet<string>, fold: AtomFold): GraphTask => {
  const takenOver = fold.foldedOf.get(task.id) ?? NO_IDS;
  const own = [...task.dependencies, ...takenOver];
  const folded = own.map((id) => fold.umbrellaOf.get(id) ?? id);
  const kept = folded.filter((id) => id !== task.id && listed.has(id));
  const dependencies = Array.from(new Set(kept)).toSorted(compareId);
  const graphTask: GraphTask = {
    id: task.id,
    packageName,
    name: task.name,
    command: task.command,
    isRunnable: !isRootTask && isRunnableTask(task),
    isTurboTask: task.isTurboTask,
    dependencies
  };

  return graphTask;
};

const graphAtomFileOf = ({ task, specPath, isLive }: AtomFile): GraphAtomFile => {
  const file: GraphAtomFile = { id: task.id, specPath, isLive };

  return file;
};

const graphAtomGroupOf = ({ umbrella, files }: AtomGroup): GraphAtomGroup => {
  const fileList = files.map(graphAtomFileOf);
  const group: GraphAtomGroup = { umbrellaId: umbrella.id, files: fileList };

  return group;
};

const graphAtomGroupsOf = (fold: AtomFold): GraphAtomGroup[] => {
  const groups = fold.groups.map(graphAtomGroupOf);

  return groups.toSorted((left, right) => compareId(left.umbrellaId, right.umbrellaId));
};

/**
 * Every visible task of every package and of the monorepo root (listed, never runnable), sorted by id, with each Atomizer group folded into its umbrella: the hidden aggregate
 * is not listed and the umbrella takes over the dependencies of its aggregate and files. The tree's scripts toggle does not
 * apply, so scripts that are not turbo tasks are listed. `dependencies` keep only listed ids, sorted.
 */
export const graphListingOf = (model: WorkspaceModel): GraphListing => {
  const fold = atomFoldOf(model);
  const visible = visibleTasksOf(model).filter(({ task }) => !fold.hidden.has(task.id));
  const listed = new Set(visible.map(({ task }) => task.id));
  const tasks = visible.map((entry) => taskOf(entry, listed, fold)).toSorted((left, right) => compareId(left.id, right.id));
  const atomGroups = graphAtomGroupsOf(fold);
  const listing: GraphListing = { tasks, atomGroups };

  return listing;
};

export const graphTasksOf = (model: WorkspaceModel): GraphTask[] => graphListingOf(model).tasks;

/** The tasks a picker offers: every turbo task, plus the scripts while the tree's scripts toggle shows them. */
export const pooledTasksOf = (tasks: GraphTask[], scriptsShown: boolean): GraphTask[] => {
  const isPooled = (task: GraphTask): boolean => task.isTurboTask || scriptsShown;

  return tasks.filter(isPooled);
};

/** Task ids then file ids: every id a run can report in a graph with this listing. */
export const runIdsOfListing = ({ tasks, atomGroups }: GraphListing): string[] => {
  const taskIds = tasks.map((task) => task.id);
  const fileIds = atomGroups.flatMap((group) => group.files.map((file) => file.id));

  return [...taskIds, ...fileIds];
};

export const runIdsOf = (state: GraphState): string[] => {
  if (state.kind !== 'graph') return NO_IDS;

  return runIdsOfListing(state);
};

/** The graph word of a run entry: a running entry whose launch node is persistent is `continuous`, any other keeps its state. */
const runWordOf = (entry: RunEntry | undefined): GraphRunState | undefined => {
  if (entry === undefined) return undefined;

  const isContinuous = entry.state === 'running' && entry.task.persistent;
  const { state } = entry;

  return isContinuous ? 'continuous' : state;
};

/** The run word of each id that has a run under `root` (`continuous` for a running persistent launch); ids no run names never appear. */
export const runsMapOf = (root: string, ids: string[], get: RunLookup): Record<string, GraphRunState> => {
  const entries = ids.map((id): [string, GraphRunState | undefined] => [id, runWordOf(get(root, id))]);
  const withRun = entries.filter((entry): entry is [string, GraphRunState] => entry[1] !== undefined);

  return Object.fromEntries(withRun);
};

const runningWordOf = (isPersistent: boolean): GraphRunState => (isPersistent ? 'continuous' : 'running');

const graphWordOf = (displayed: DisplayedRun, own: RunEntry | undefined, isPersistent: boolean): GraphRunState => {
  if (own?.state === 'running') return runningWordOf(own.task.persistent);

  if (displayed.owner !== null) return runningWordOf(isPersistent);

  return displayed.state;
};

/**
 * The runs message of the listed `ids` under `root` (spec D9, D11): each id's word from its own run and the progress records
 * (`continuous` for a running persistent task, own or owned), and `owners` for the ids that run under another task's run,
 * left out when there is none. Ids no run names never appear, and an id that is not in `ids` never does.
 */
export const runsMessageOf = (root: string, ids: string[], sources: RunSources): GraphRunsMessage => {
  const { get, recordsOf, persistentIds } = sources;
  const runs = new Map<string, GraphRunState>();
  const owners = new Map<string, string>();

  for (const id of ids) {
    const own = get(root, id);
    const displayed = displayRunOf(own, recordsOf(root, id));

    if (displayed === null) continue;

    runs.set(id, graphWordOf(displayed, own, persistentIds.has(id)));

    if (displayed.owner !== null) owners.set(id, displayed.owner);
  }

  const runsRecord = Object.fromEntries(runs);

  if (owners.size === 0) {
    const plain: GraphRunsMessage = { type: 'runs', runs: runsRecord };

    return plain;
  }

  const owned: GraphRunsMessage = { type: 'runs', runs: runsRecord, owners: Object.fromEntries(owners) };

  return owned;
};
