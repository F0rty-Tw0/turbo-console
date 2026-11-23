import type { FallbackLinks } from '../common/fallback-links.type.ts';

const UNREACHED = -1;

/** Multi-source BFS from every child nothing points at: each child's shortest distance from a root, or `UNREACHED`. */
const depthsOf = (links: FallbackLinks): Int32Array => {
  const count = links.indegree.length;
  const depths = new Int32Array(count).fill(UNREACHED);
  const queue = new Int32Array(count);
  let tail = 0;

  for (let index = 0; index < count; index += 1) {
    if (links.indegree[index] !== 0) continue;

    depths[index] = 0;
    queue[tail] = index;
    tail += 1;
  }

  for (let head = 0; head < tail; head += 1) {
    const node = queue[head] ?? 0;
    const depth = (depths[node] ?? 0) + 1;

    for (const target of links.targets[node] ?? []) {
      if (depths[target] !== UNREACHED) continue;

      depths[target] = depth;
      queue[tail] = target;
      tail += 1;
    }
  }

  return depths;
};

/** Each index's place when the indices are sorted as the strings `n0`, `n1`, … are: 0, 1, 10, 11, 2, … */
const idRanksOf = (count: number): Int32Array => {
  const indices = Array.from({ length: count }, (_: unknown, index: number): number => index);
  const texts = indices.map(String);
  const byText = (a: number, b: number): number => ((texts[a] ?? '') < (texts[b] ?? '') ? -1 : 1);
  const ranks = new Int32Array(count);

  indices.sort(byText);

  for (const [rank, index] of indices.entries()) ranks[index] = rank;

  return ranks;
};

/** The reached children grouped by depth, each row in index order. */
const reachedRowsOf = (depths: Int32Array): number[][] => {
  const rows: number[][] = [];

  for (const [index, depth] of depths.entries()) {
    if (depth === UNREACHED) continue;

    const row = rows[depth] ?? [];

    row.push(index);
    rows[depth] = row;
  }

  return rows;
};

const unreachedOf = (depths: Int32Array): number[] => {
  const unreached: number[] = [];

  for (const [index, depth] of depths.entries()) if (depth === UNREACHED) unreached.push(index);

  return unreached;
};

/**
 * Cytoscape's `breadthfirst` rows (`directed: true`, not `maximal`), top to bottom, as child indices:
 * - depth is the shortest distance from a root, a child with no incoming edge from another child;
 * - each row, shallowest first, is sorted by the mean of `place / row length` over the child's neighbours in shallower
 *   rows (0 when there are none), summed in neighbour order so the floats round the same, ties by the id `n${index}`;
 * - children unreached from any root, such as a cycle and everything under it, form a new top row in index order.
 */
export const fallbackRowsOf = (links: FallbackLinks): number[][] => {
  const count = links.indegree.length;
  const depths = depthsOf(links);
  const ranks = idRanksOf(count);
  const rows = reachedRowsOf(depths);
  const places = new Int32Array(count);
  const percents = new Float64Array(count);
  const percentOf = (node: number, depth: number): number => {
    let sum = 0;
    let samples = 0;

    for (const neighbour of links.neighbours[node] ?? []) {
      const neighbourDepth = depths[neighbour] ?? UNREACHED;
      const isAbove = neighbourDepth !== UNREACHED && neighbourDepth < depth;

      if (!isAbove) continue;

      sum += (places[neighbour] ?? 0) / (rows[neighbourDepth]?.length ?? 1);
      samples += 1;
    }

    return sum / Math.max(1, samples);
  };
  const byPercentThenId = (a: number, b: number): number => {
    const diff = (percents[a] ?? 0) - (percents[b] ?? 0);
    const idOrder = (ranks[a] ?? 0) - (ranks[b] ?? 0);

    return diff === 0 ? idOrder : diff;
  };

  for (const [depth, row] of rows.entries()) {
    for (const node of row) percents[node] = percentOf(node, depth);

    row.sort(byPercentThenId);

    for (const [place, node] of row.entries()) places[node] = place;
  }

  const unreached = unreachedOf(depths);

  if (unreached.length > 0) rows.unshift(unreached);

  return rows;
};
