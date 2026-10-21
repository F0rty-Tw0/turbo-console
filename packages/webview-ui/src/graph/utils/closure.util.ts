import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { Closure } from '../common/closure.type.ts';

type EndOf = (edge: GraphEdge) => string;

const sourceOf: EndOf = (edge) => edge.source;

const targetOf: EndOf = (edge) => edge.target;

const edgesByStart = (edges: GraphEdge[], startOf: EndOf): Map<string, GraphEdge[]> => {
  const byStart = new Map<string, GraphEdge[]>();

  for (const edge of edges) {
    const start = startOf(edge);
    const sameStart = byStart.get(start) ?? [];

    byStart.set(start, [...sameStart, edge]);
  }

  return byStart;
};

const reachableFrom = (start: string, edges: GraphEdge[], startOf: EndOf, endOf: EndOf): Set<string> => {
  const byStart = edgesByStart(edges, startOf);
  const visited = new Set<string>();
  const queue = [start];

  for (const name of queue) {
    const outgoing = byStart.get(name) ?? [];
    const next = outgoing.map(endOf).filter((end) => !visited.has(end));

    for (const end of next) visited.add(end);

    queue.push(...next);
  }

  visited.delete(start);

  return visited;
};

/** The transitive dependencies and dependents of `selected`; never the name itself. */
export const closureOf = (selected: string, edges: GraphEdge[]): Closure => {
  const dependencies = reachableFrom(selected, edges, sourceOf, targetOf);
  const dependents = reachableFrom(selected, edges, targetOf, sourceOf);
  const closure: Closure = { dependencies, dependents };

  return closure;
};

/** The edges whose two ends are both in `packages`, each `source>target` pair once, in order. */
export const drawableEdges = (packages: string[], edges: GraphEdge[]): GraphEdge[] => {
  const names = new Set(packages);
  const seen = new Set<string>();
  const drawable: GraphEdge[] = [];

  for (const edge of edges) {
    const key = `${edge.source}>${edge.target}`;
    const hasSource = names.has(edge.source);
    const hasTarget = names.has(edge.target);
    const isRepeat = seen.has(key);

    if (!hasSource || !hasTarget || isRepeat) continue;

    seen.add(key);
    drawable.push(edge);
  }

  return drawable;
};
