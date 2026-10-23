import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { TASK_CAP } from '../common/graph-task.const.ts';
import type { ShownSet, ShownSetInput } from '../common/shown-set.type.ts';

type Hops = Map<string, number>;

type Index = Map<string, string[]>;

type Reach = {
  readonly chosen: string[];
  readonly dependencyHops: Hops;
  readonly dependentHops: Hops;
};

type Keeps = {
  readonly dependencies: number;
  readonly dependents: number;
};

const dependenciesIndexOf = (tasks: GraphTask[]): Index => {
  const known = new Set(tasks.map((task) => task.id));
  const index: Index = new Map();

  for (const task of tasks) {
    const needed = task.dependencies.filter((id) => known.has(id));

    index.set(task.id, needed);
  }

  return index;
};

const dependentsIndexOf = (dependencies: Index): Index => {
  const index: Index = new Map();

  for (const [id, needed] of dependencies) {
    for (const dependency of needed) {
      const dependents = index.get(dependency) ?? [];

      index.set(dependency, [...dependents, id]);
    }
  }

  return index;
};

/** The BFS distance from the nearest chosen task to every other task reachable through `index`. */
const hopsFrom = (chosen: string[], index: Index): Hops => {
  const starts = chosen.map((id): [string, number] => [id, 0]);
  const hops: Hops = new Map(starts);
  const queue = [...chosen];

  for (const id of queue) {
    const next = (hops.get(id) ?? 0) + 1;

    const neighbours = index.get(id) ?? [];

    for (const neighbour of neighbours) {
      const isReached = hops.has(neighbour);

      if (isReached) continue;

      hops.set(neighbour, next);
      queue.push(neighbour);
    }
  }

  for (const id of chosen) hops.delete(id);

  return hops;
};

const deepestOf = (hops: Hops): number => {
  const levels = Array.from(hops.values());

  return Math.max(0, ...levels);
};

const withinHops = (hops: Hops, keep: number): string[] => {
  const entries = [...hops];
  const kept = entries.filter(([, hop]) => hop <= keep);

  return kept.map(([id]) => id);
};

const shownFor = (reach: Reach, keeps: Keeps): Set<string> => {
  const dependencies = withinHops(reach.dependencyHops, keeps.dependencies);
  const dependents = withinHops(reach.dependentHops, keeps.dependents);
  const shown = new Set([...reach.chosen, ...dependencies, ...dependents]);

  return shown;
};

/** Drops the deepest dependent hop level first, then the deepest dependency hop level; never dependency hop 1. */
const nextKeeps = (keeps: Keeps): Keeps | null => {
  const shallowerDependents: Keeps = { ...keeps, dependents: keeps.dependents - 1 };
  const shallowerDependencies: Keeps = { ...keeps, dependencies: keeps.dependencies - 1 };

  if (keeps.dependents > 0) return shallowerDependents;

  if (keeps.dependencies > 1) return shallowerDependencies;

  return null;
};

const fittedShown = (reach: Reach, start: Keeps, limit: number): Set<string> => {
  let keeps = start;
  let shown = shownFor(reach, keeps);

  for (let next = nextKeeps(keeps); shown.size > limit && next !== null; next = nextKeeps(keeps)) {
    keeps = next;
    shown = shownFor(reach, keeps);
  }

  return shown;
};

const sortedOf = (ids: Iterable<string>): string[] => {
  const copy = [...ids];

  return copy.sort();
};

/** The task ids to draw for `chosen`: its dependency chain plus `depth` dependent hops, cut to the cap unless lifted. */
export const shownSetOf = (input: ShownSetInput): ShownSet => {
  const dependenciesIndex = dependenciesIndexOf(input.tasks);
  const dependentsIndex = dependentsIndexOf(dependenciesIndex);
  const distinct = new Set(input.chosen);
  const chosen = [...distinct];
  const known = chosen.filter((id) => dependenciesIndex.has(id));
  const reach: Reach = {
    chosen: known,
    dependencyHops: hopsFrom(known, dependenciesIndex),
    dependentHops: hopsFrom(known, dependentsIndex)
  };
  const start: Keeps = {
    dependencies: deepestOf(reach.dependencyHops),
    dependents: Math.min(input.depth, deepestOf(reach.dependentHops))
  };
  const limit = input.capLifted ? Infinity : TASK_CAP;
  const shown = fittedShown(reach, start, limit);
  const hiddenCount = shownFor(reach, start).size - shown.size;
  const droppedIds = chosen.filter((id) => !dependenciesIndex.has(id));
  const shownSet: ShownSet = { ids: sortedOf(shown), hiddenCount, droppedIds: sortedOf(droppedIds) };

  return shownSet;
};
