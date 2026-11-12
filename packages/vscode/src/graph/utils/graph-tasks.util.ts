import type { AtomFile, AtomGroup, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphAtomFile, GraphAtomGroup, GraphRunState, GraphRunsMessage, GraphState, GraphTask } from '@turbo-console/webview-ui';

import { atomFoldOf } from './graph-atoms.util.ts';
import type { DisplayedRun } from '../../run/common/run-progress.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { displayRunOf } from '../../run/utils/run-display.util.ts';
import { isRunnableTask, isVisibleTask } from '../../tree/utils/task-filter.util.ts';
import type { AtomFold, GraphListing } from '../common/graph-atom.type.ts';
import type { RunSources } from '../common/graph.type.ts';

type VisibleTask = { readonly packageName: string; readonly task: TaskNode };

/** Default string order, so the same ids sort the same on every machine. */
const compareId = (left: string, right: string): number => Number(left > right) - Number(left < right);

const visibleOf = (pkg: PackageNode): VisibleTask[] => {
  const tasks = pkg.tasks.filter(isVisibleTask);

  return tasks.map((task) => {
    const visible: VisibleTask = { packageName: pkg.name, task };

    return visible;
  });
};

const visibleTasksOf = (model: WorkspaceModel): VisibleTask[] => model.packages.flatMap(visibleOf);

/** The ids a running word shows as `continuous`: the visible tasks the model marks persistent. */
export const persistentIdsOf = (model: WorkspaceModel): ReadonlySet<string> => {
  const persistent = visibleTasksOf(model).filter(({ task }) => task.persistent);
  const ids = persistent.map(({ task }) => task.id);

  return new Set(ids);
};

const NO_IDS: string[] = [];

const taskOf = ({ packageName, task }: VisibleTask, listed: ReadonlySet<string>, fold: AtomFold): GraphTask => {
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
    isRunnable: isRunnableTask(task),
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
 * Every visible task of every package, the root `//` included, sorted by id, with each Atomizer group folded into its umbrella: the hidden aggregate
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

const runningWordOf = (isPersistent: boolean): GraphRunState => (isPersistent ? 'continuous' : 'running');

/** The graph word of a displayed run: the own run's `running` wins, as `displayRunOf` ranks it (D9 rule 1); this maps the word only. */
const graphWordOf = (displayed: DisplayedRun, own: RunEntry | undefined, isPersistent: boolean): GraphRunState => {
  if (own?.state === 'running') return runningWordOf(own.task.persistent);

  if (displayed.owner !== null) return runningWordOf(isPersistent);

  return displayed.state;
};

/**
 * The runs message of the listed `ids` under `root` (spec D9, D11): each id's word from its own run and the progress records
 * (`continuous` for a running persistent task, own or owned), and `owners` for the ids that run under another task's run,
 * left out when there is none. Ids no run names never appear, and an id that is not in `ids` never does. `predictions` is carried
 * as given, and the key is absent while it is `null`.
 */
export const runsMessageOf = (
  root: string,
  ids: string[],
  sources: RunSources,
  predictions: NonNullable<GraphRunsMessage['predictions']> | null = null
): GraphRunsMessage => {
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
  const plain: GraphRunsMessage = { type: 'runs', runs: runsRecord };
  const ownersRecord = Object.fromEntries(owners);
  const withOwners: GraphRunsMessage = { ...plain, owners: ownersRecord };
  const owned = owners.size === 0 ? plain : withOwners;

  if (predictions === null) return owned;

  const predicted: GraphRunsMessage = { ...owned, predictions };

  return predicted;
};
