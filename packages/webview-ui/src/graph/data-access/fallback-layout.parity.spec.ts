import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { breadthfirstPositions } from './fallback-layout.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import { oraclePositions } from '../test/utils/breadthfirst-oracle.spec.util.ts';
import { edgeOf, fallbackGraphOf, seededGraphOf } from '../test/utils/fallback-graph.spec.util.ts';

const SEEDS = [1, 7, 42, 1234, 99991, 2026];

const GRAPH_SIZE = 300;

const SPARSE_EDGES = 450;

const DENSE_EDGES = 2400;

/**
 * Entries, not the records: a record keyed `constructor` makes `toStrictEqual` compare its `constructor` entries as
 * the records' types, which are two different objects.
 */
const layoutOf = (graph: ElkNode): [string, Position][] => Object.entries(breadthfirstPositions(graph));

const oracleOf = (graph: ElkNode): [string, Position][] => Object.entries(oraclePositions(graph));

describe('FEATURE: breadthfirstPositions parity with headless Cytoscape breadthfirst', () => {
  describe.each(SEEDS)('GIVEN a sparse seeded graph with cycles, self-loops and dangling edges, seed %i', (seed: number) => {
    it('WHEN laid out THEN every position equals the oracle', () => {
      const graph = seededGraphOf(seed, GRAPH_SIZE, SPARSE_EDGES);

      expect(layoutOf(graph)).toStrictEqual(oracleOf(graph));
    });
  });

  describe.each(SEEDS)('GIVEN a dense seeded graph, many children with 3+ shallower neighbours, seed %i', (seed: number) => {
    it('WHEN laid out THEN every position equals the oracle', () => {
      const graph = seededGraphOf(seed, GRAPH_SIZE, DENSE_EDGES);

      expect(layoutOf(graph)).toStrictEqual(oracleOf(graph));
    });
  });

  describe('GIVEN a repeated child name a, edges a > b and c > a', () => {
    const graph = fallbackGraphOf(['a', 'b', 'a', 'c'], [edgeOf('a', 'b'), edgeOf('c', 'a')]);

    it('WHEN laid out THEN the last a wins, as in the oracle', () => {
      expect(layoutOf(graph)).toStrictEqual(oracleOf(graph));
    });
  });

  describe('GIVEN a root-less cycle c <> d with e under it, next to a > b and a self-looped root f', () => {
    const edges = [edgeOf('c', 'd'), edgeOf('d', 'c'), edgeOf('d', 'e'), edgeOf('a', 'b'), edgeOf('f', 'f')];
    const graph = fallbackGraphOf(['a', 'b', 'c', 'd', 'e', 'f'], edges);

    it('WHEN laid out THEN every position equals the oracle', () => {
      expect(layoutOf(graph)).toStrictEqual(oracleOf(graph));
    });
  });

  describe('GIVEN roots a, b with b > y, b > z, and z also under a root-less cycle c <> d', () => {
    const edges = [edgeOf('b', 'y'), edgeOf('b', 'z'), edgeOf('c', 'd'), edgeOf('d', 'c'), edgeOf('d', 'z')];
    const graph = fallbackGraphOf(['a', 'b', 'y', 'z', 'c', 'd'], edges);

    it('WHEN laid out THEN every position equals the oracle', () => {
      expect(layoutOf(graph)).toStrictEqual(oracleOf(graph));
    });
  });

  describe('GIVEN a repeated leaf pair a > b twice next to c > a', () => {
    const graph = fallbackGraphOf(['a', 'b', 'c'], [edgeOf('a', 'b'), edgeOf('c', 'a'), edgeOf('a', 'b')]);

    it('WHEN laid out THEN every position equals the oracle', () => {
      expect(layoutOf(graph)).toStrictEqual(oracleOf(graph));
    });
  });
});
