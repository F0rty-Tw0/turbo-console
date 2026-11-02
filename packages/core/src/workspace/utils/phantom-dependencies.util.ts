import type { DependencyResolver } from '../common/workspace-model.type.ts';

/** What one phantom walk found: the `ids` it reached, and `low`, the rank of the earliest live phantom it ran back into. */
type Walk = {
  readonly ids: string[];
  readonly low: number;
};

const NO_LOOP = Number.POSITIVE_INFINITY;

const foundOf = (ids: string[], low: number): Walk => {
  const walk: Walk = { ids, low };

  return walk;
};

const lowestOf = (low: number, walk: Walk): number => Math.min(low, walk.low);

const idsOf = (walk: Walk): string[] => walk.ids;

/** Sorted `ids` with each repeat dropped: sorted, a repeat is the id just before it. */
const uniqueOf = (sorted: string[]): string[] => {
  const isFirst = (id: string, index: number): boolean => id !== sorted[index - 1];

  return sorted.filter(isFirst);
};

/**
 * One resolver per model. Its result is `raw` with each phantom id replaced by that phantom's dependencies, recursively,
 * then cut to `visibleIds` and sorted. Turbo still orders through a phantom, so its edges pass to the tasks that depend
 * on it. A phantom is walked once (Tarjan's SCC): `live` ranks each phantom entered and not yet settled. One that ran
 * back into a live phantom ranked before it (a cycle) waits on `pending`; a repeat visit adds nothing, its ids already
 * flowed up. The head of the cycle has seen all of it: its result is kept for every phantom that waited on it.
 * Ids that came through a phantom are deduped; a task with no phantom keeps turbo's own edges, which hold no repeats.
 * A phantom is never visible, so only a task with a hidden id is checked for phantoms.
 */
export const dependencyResolverOf = (phantoms: ReadonlyMap<string, string[]>, visibleIds: ReadonlySet<string>): DependencyResolver => {
  const resolved = new Map<string, string[]>();
  const live = new Map<string, number>();
  const pending: string[] = [];
  const isVisible = (id: string): boolean => visibleIds.has(id);
  const isPhantom = (id: string): boolean => phantoms.has(id);
  const visibleOf = (ids: string[]): string[] => ids.filter(isVisible).toSorted();
  const passedOf = (ids: string[]): string[] => uniqueOf(visibleOf(ids));

  const settle = (from: number, ids: string[]): void => {
    const members = pending.splice(from);

    members.forEach((member) => {
      resolved.set(member, ids);
      live.delete(member);
    });
  };

  const walkOf = (id: string): Walk => {
    const done = resolved.get(id);

    if (done !== undefined) return foundOf(done, NO_LOOP);

    const through = phantoms.get(id);

    if (through === undefined) return foundOf([id], NO_LOOP);

    const liveRank = live.get(id);

    if (liveRank !== undefined) return foundOf([], liveRank);

    const rank = live.size;
    const mark = pending.length;

    live.set(id, rank);

    const walks = through.map(walkOf);
    const ids = passedOf(walks.flatMap(idsOf));
    const low = walks.reduce(lowestOf, NO_LOOP);
    const isHead = low >= rank;

    if (isHead) {
      settle(mark, ids);
      live.delete(id);
      resolved.set(id, ids);
    } else {
      pending.push(id);
    }

    return foundOf(ids, low);
  };

  const resolve: DependencyResolver = (raw) => {
    const visible = raw.filter(isVisible);
    const isAllVisible = visible.length === raw.length;

    if (isAllVisible) return visible.toSorted();

    const hasPhantom = raw.some(isPhantom);

    if (!hasPhantom) return visible.toSorted();

    return passedOf(raw.map(walkOf).flatMap(idsOf));
  };

  return resolve;
};
