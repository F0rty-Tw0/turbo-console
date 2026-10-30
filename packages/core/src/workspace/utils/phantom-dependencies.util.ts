import type { DependencyResolver } from '../common/workspace-model.type.ts';

/** What one phantom walk found: the `ids` it reached, and `low`, the depth of the shallowest open phantom it ran back into. */
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

/**
 * One resolver per model. Its result is `raw` with each phantom id replaced by that phantom's dependencies, recursively,
 * then cut to `visibleIds`, deduped and sorted. Turbo still orders through a phantom, so its edges pass to the tasks
 * that depend on it. A phantom is walked once: the result is kept unless the walk ran back into a phantom still open
 * above it (a cycle); the top of a cycle has seen all of it, so its result is kept.
 */
export const dependencyResolverOf = (phantoms: ReadonlyMap<string, string[]>, visibleIds: ReadonlySet<string>): DependencyResolver => {
  const resolved = new Map<string, string[]>();
  const open = new Map<string, number>();

  const isVisible = (id: string): boolean => visibleIds.has(id);

  const visibleOf = (ids: string[]): string[] => {
    const visible = new Set(ids.filter(isVisible));
    const unique = Array.from(visible);

    return unique.toSorted();
  };

  const walkOf = (id: string): Walk => {
    const done = resolved.get(id);

    if (done !== undefined) return foundOf(done, NO_LOOP);

    const through = phantoms.get(id);

    if (through === undefined) return foundOf([id], NO_LOOP);

    const openDepth = open.get(id);

    if (openDepth !== undefined) return foundOf([], openDepth);

    const depth = open.size;

    open.set(id, depth);

    const walks = through.map(walkOf);

    open.delete(id);

    const ids = visibleOf(walks.flatMap(idsOf));
    const low = walks.reduce(lowestOf, NO_LOOP);
    const isComplete = low >= depth;

    if (isComplete) resolved.set(id, ids);

    return foundOf(ids, low);
  };

  const resolve: DependencyResolver = (raw) => {
    const hasPhantom = raw.some((id) => phantoms.has(id));

    if (!hasPhantom) return raw.filter(isVisible).toSorted();

    return visibleOf(raw.map(walkOf).flatMap(idsOf));
  };

  return resolve;
};
