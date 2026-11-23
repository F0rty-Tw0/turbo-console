import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { beforeEach, describe, expect, it } from 'vitest';

import { breadthfirstPositions } from './fallback-layout.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { FallbackLinks } from '../common/fallback-links.type.ts';
import { oraclePositions } from '../test/utils/breadthfirst-oracle.spec.util.ts';
import { edgeOf, fallbackGraphOf, seededGraphOf } from '../test/utils/fallback-graph.spec.util.ts';
import { fallbackLinksOf } from '../utils/fallback-links.util.ts';
import { fallbackRowsOf } from '../utils/fallback-rows.util.ts';

const SEEDS = [1, 7, 42, 1234, 99991, 2026];

const GRAPH_SIZE = 300;

const SPARSE_EDGES = 450;

const DENSE_EDGES = 2400;

const DENSE_NEIGHBOURS = 3;

const DENSE_CHILDREN_FLOOR = 100;

const OFF_ROW = -1;

/**
 * Entries, not the records: a record keyed `constructor` makes `toStrictEqual` compare its `constructor` entries as
 * the records' types, which are two different objects.
 */
const layoutOf = (graph: ElkNode): [string, Position][] => Object.entries(breadthfirstPositions(graph));

const oracleOf = (graph: ElkNode): [string, Position][] => Object.entries(oraclePositions(graph));

/** The rows without the unreached top row, which sorts no other row: a top row of roots has no incoming edge. */
const reachedRowsOf = (links: FallbackLinks): number[][] => {
  const rows = fallbackRowsOf(links);
  const isEntered = (node: number): boolean => (links.indegree[node] ?? 0) > 0;
  const hasUnreachedTop = rows[0]?.some(isEntered) === true;
  const belowTop = rows.slice(1);

  return hasUnreachedTop ? belowTop : rows;
};

/** Each child's index among the reached rows, or `OFF_ROW` when it is unreached. */
const reachedRowIndicesOf = (links: FallbackLinks): Int32Array => {
  const rows = reachedRowsOf(links);
  const rowIndices = new Int32Array(links.indegree.length).fill(OFF_ROW);

  for (const [rowIndex, row] of rows.entries()) {
    for (const node of row) rowIndices[node] = rowIndex;
  }

  return rowIndices;
};

/** The children whose row sort sums `DENSE_NEIGHBOURS` or more floats: that many neighbours in shallower reached rows. */
const denseChildCountOf = (graph: ElkNode): number => {
  const links = fallbackLinksOf(graph);
  const rowIndices = reachedRowIndicesOf(links);
  const isDense = (neighbours: number[], node: number): boolean => {
    const own = rowIndices[node] ?? OFF_ROW;
    const isAbove = (neighbour: number): boolean => {
      const row = rowIndices[neighbour] ?? OFF_ROW;

      return row !== OFF_ROW && row < own;
    };
    const above = neighbours.filter(isAbove);

    return above.length >= DENSE_NEIGHBOURS;
  };

  return links.neighbours.filter(isDense).length;
};

describe('FEATURE: breadthfirstPositions parity with headless Cytoscape breadthfirst', () => {
  describe.each(SEEDS)('GIVEN a sparse seeded graph with cycles, self-loops and dangling edges, seed %i', (seed: number) => {
    it('WHEN laid out THEN every position equals the oracle', () => {
      const graph = seededGraphOf(seed, GRAPH_SIZE, SPARSE_EDGES);

      const layout = layoutOf(graph);

      expect(layout).toStrictEqual(oracleOf(graph));
    });
  });

  describe.each(SEEDS)('GIVEN a dense seeded graph, many children with 3+ shallower neighbours, seed %i', (seed: number) => {
    let graph: ElkNode;

    beforeEach(() => {
      graph = seededGraphOf(seed, GRAPH_SIZE, DENSE_EDGES);
    });

    it('WHEN laid out THEN every position equals the oracle', () => {
      const layout = layoutOf(graph);

      expect(layout).toStrictEqual(oracleOf(graph));
    });

    it(`WHEN its rows are built THEN at least ${DENSE_CHILDREN_FLOOR} children have 3+ shallower neighbours`, () => {
      const denseChildren = denseChildCountOf(graph);

      expect(denseChildren).toBeGreaterThanOrEqual(DENSE_CHILDREN_FLOOR);
    });
  });

  describe('GIVEN a repeated child name a, edges a > b and c > a', () => {
    it('WHEN laid out THEN the last a wins, as in the oracle', () => {
      const graph = fallbackGraphOf(['a', 'b', 'a', 'c'], [edgeOf('a', 'b'), edgeOf('c', 'a')]);

      const layout = layoutOf(graph);

      expect(layout).toStrictEqual(oracleOf(graph));
    });
  });

  describe('GIVEN a root-less cycle c <> d with e under it, next to a > b and a self-looped root f', () => {
    it('WHEN laid out THEN every position equals the oracle', () => {
      const edges = [edgeOf('c', 'd'), edgeOf('d', 'c'), edgeOf('d', 'e'), edgeOf('a', 'b'), edgeOf('f', 'f')];
      const graph = fallbackGraphOf(['a', 'b', 'c', 'd', 'e', 'f'], edges);

      const layout = layoutOf(graph);

      expect(layout).toStrictEqual(oracleOf(graph));
    });
  });

  describe('GIVEN roots a, b with b > y, b > z, and z also under a root-less cycle c <> d', () => {
    it('WHEN laid out THEN every position equals the oracle', () => {
      const edges = [edgeOf('b', 'y'), edgeOf('b', 'z'), edgeOf('c', 'd'), edgeOf('d', 'c'), edgeOf('d', 'z')];
      const graph = fallbackGraphOf(['a', 'b', 'y', 'z', 'c', 'd'], edges);

      const layout = layoutOf(graph);

      expect(layout).toStrictEqual(oracleOf(graph));
    });
  });

  describe('GIVEN a repeated leaf pair a > b twice next to c > a', () => {
    it('WHEN laid out THEN every position equals the oracle', () => {
      const graph = fallbackGraphOf(['a', 'b', 'c'], [edgeOf('a', 'b'), edgeOf('c', 'a'), edgeOf('a', 'b')]);

      const layout = layoutOf(graph);

      expect(layout).toStrictEqual(oracleOf(graph));
    });
  });
});
