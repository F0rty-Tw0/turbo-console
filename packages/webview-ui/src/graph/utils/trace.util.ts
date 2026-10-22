import { edgeIdOf } from './edge-id.util.ts';
import { walkFrom } from './walk.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { TraceDirection, TraceResult } from '../common/trace.type.ts';

const shortestPath = (edges: GraphEdge[], first: string, last: string): string[] | null => {
  const walk = walkFrom(edges, first, 'dependencies');
  const isReached = walk.distances.has(last);

  if (!isReached) return null;

  const path: string[] = [];

  for (let step: string | undefined = last; step !== undefined; step = walk.parents.get(step)) path.push(step);

  return path.reverse();
};

const edgesAlong = (path: string[], edges: GraphEdge[]): GraphEdge[] => {
  const byId = new Map<string, GraphEdge>();

  for (const edge of edges) {
    const id = edgeIdOf(edge);
    const isRepeat = byId.has(id);

    if (!isRepeat) byId.set(id, edge);
  }

  const targets = path.slice(1);
  const along: GraphEdge[] = [];

  for (const [index, target] of targets.entries()) {
    const pair: GraphEdge = { source: path[index] ?? '', target };
    const edge = byId.get(edgeIdOf(pair));

    if (edge) along.push(edge);
  }

  return along;
};

const resultOf = (direction: TraceDirection, path: string[], edges: GraphEdge[]): TraceResult => {
  const along = edgesAlong(path, edges);
  const result: TraceResult = { direction, path, edges: along };

  return result;
};

/** The shortest path from `start` to `end` along `source -> target`, else the same from `end` to `start`. */
export const traceOf = (edges: GraphEdge[], start: string, end: string): TraceResult => {
  const forward = shortestPath(edges, start, end);

  if (forward) return resultOf('forward', forward, edges);

  const backward = shortestPath(edges, end, start);

  if (backward) return resultOf('backward', backward, edges);

  return resultOf('none', [], edges);
};
