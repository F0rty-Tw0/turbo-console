import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { Neighbours } from '../common/neighbours.type.ts';

/** Code-unit order, so the lists never depend on the locale. */
const sortedOf = (names: Set<string>): string[] => {
  const list = Array.from(names);

  list.sort();

  return list;
};

/** The packages `name` depends on and those depending on it, each once, sorted by code unit. */
export const neighboursOf = (name: string, edges: GraphEdge[]): Neighbours => {
  const dependencies = new Set<string>();
  const dependents = new Set<string>();

  for (const edge of edges) {
    if (edge.source === name) dependencies.add(edge.target);

    if (edge.target === name) dependents.add(edge.source);
  }

  const sortedDependencies = sortedOf(dependencies);
  const sortedDependents = sortedOf(dependents);
  const neighbours: Neighbours = { dependencies: sortedDependencies, dependents: sortedDependents };

  return neighbours;
};
