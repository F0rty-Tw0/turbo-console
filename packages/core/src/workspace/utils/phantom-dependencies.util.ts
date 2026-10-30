/**
 * `raw` with each phantom id replaced by that phantom's dependencies, recursively, then cut to `visibleIds`, deduped
 * and sorted. Turbo still orders through a phantom, so its edges pass to the tasks that depend on it.
 * grug: one visited set per task, no memo; add one if the stretch-300 perf round shows a deep chain.
 */
export const dependenciesThroughOf = (
  raw: string[],
  phantoms: ReadonlyMap<string, string[]>,
  visibleIds: ReadonlySet<string>
): string[] => {
  const visited = new Set<string>();

  const expand = (id: string): string[] => {
    const through = phantoms.get(id);

    if (through === undefined) return [id];

    const isVisited = visited.has(id);

    if (isVisited) return [];

    visited.add(id);

    return through.flatMap(expand);
  };

  const reached = raw.flatMap(expand);
  const visible = new Set(reached.filter((id) => visibleIds.has(id)));

  const ids = [...visible];

  return ids.toSorted();
};
