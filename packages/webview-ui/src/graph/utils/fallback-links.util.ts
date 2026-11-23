import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';

import type { FallbackLinks } from '../common/fallback-links.type.ts';

type Pair = [number, number];

const indexEntryOf = (child: ElkNode, index: number): [string, number] => [child.id, index];

const emptyListsOf = (count: number): number[][] => Array.from({ length: count }, (): number[] => []);

const pairOf = (edge: ElkEdge, indexByName: Map<string, number>): Pair | undefined => {
  const [sourceName] = edge.sources;
  const [targetName] = edge.targets;

  if (sourceName === undefined || targetName === undefined) return undefined;

  const source = indexByName.get(sourceName);
  const target = indexByName.get(targetName);

  if (source === undefined || target === undefined) return undefined;

  const pair: Pair = [source, target];

  return pair;
};

/** The edges between two present, different children, each source and target pair once, in edge input order. */
const distinctPairsOf = (edges: ElkEdge[], indexByName: Map<string, number>, count: number): Pair[] => {
  const seen = new Set<number>();
  const pairs: Pair[] = [];

  for (const edge of edges) {
    const pair = pairOf(edge, indexByName);

    if (pair === undefined) continue;

    const [source, target] = pair;
    const key = source * count + target;
    const isSeen = seen.has(key);

    if (source === target || isSeen) continue;

    seen.add(key);
    pairs.push(pair);
  }

  return pairs;
};

/** Each child's other ends, either direction, each once and in the order of the first pair that joins them. */
const neighboursOf = (pairs: Pair[], count: number): number[][] => {
  const neighbours = emptyListsOf(count);
  const seen = new Set<number>();

  for (const [source, target] of pairs) {
    const key = Math.min(source, target) * count + Math.max(source, target);
    const isSeen = seen.has(key);

    if (isSeen) continue;

    seen.add(key);
    neighbours[source]?.push(target);
    neighbours[target]?.push(source);
  }

  return neighbours;
};

/**
 * The ELK graph's children as indices, for the fallback rows. A repeated child name resolves to its last child, as
 * `new Map` does. Edges with a missing end, self-loops and repeats of a source and target pair are left out: none of
 * them moves a child in Cytoscape's `breadthfirst`, whose rows these reproduce.
 */
export const fallbackLinksOf = (graph: ElkNode): FallbackLinks => {
  const children = graph.children ?? [];
  const count = children.length;
  const indexEntries = children.map(indexEntryOf);
  const indexByName = new Map(indexEntries);
  const pairs = distinctPairsOf(graph.edges ?? [], indexByName, count);
  const targets = emptyListsOf(count);
  const indegree = new Int32Array(count);

  for (const [source, target] of pairs) {
    targets[source]?.push(target);
    indegree[target] = (indegree[target] ?? 0) + 1;
  }

  const neighbours = neighboursOf(pairs, count);
  const links: FallbackLinks = { targets, neighbours, indegree };

  return links;
};
