import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { Walk, WalkDirection } from '../common/trace.type.ts';

const neighboursByName = (edges: GraphEdge[], direction: WalkDirection): Map<string, string[]> => {
  const isForward = direction === 'dependencies';
  const byName = new Map<string, string[]>();

  for (const edge of edges) {
    const from = isForward ? edge.source : edge.target;
    const to = isForward ? edge.target : edge.source;
    const sameFrom = byName.get(from) ?? [];

    sameFrom.push(to);
    byName.set(from, sameFrom);
  }

  for (const names of byName.values()) names.sort();

  return byName;
};

/** Breadth-first from `first`, neighbours in code-unit name order, so the first parent found is the same every time. */
export const walkFrom = (edges: GraphEdge[], first: string, direction: WalkDirection): Walk => {
  const neighbours = neighboursByName(edges, direction);
  const distances = new Map<string, number>([[first, 0]]);
  const parents = new Map<string, string>();
  const queue = [first];

  for (const name of queue) {
    const distance = distances.get(name) ?? 0;
    const next = neighbours.get(name) ?? [];
    const unseen = next.filter((neighbour) => !distances.has(neighbour));

    for (const neighbour of unseen) {
      distances.set(neighbour, distance + 1);
      parents.set(neighbour, name);
      queue.push(neighbour);
    }
  }

  const walk: Walk = { distances, parents };

  return walk;
};
