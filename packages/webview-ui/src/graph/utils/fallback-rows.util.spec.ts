import type { ElkEdge } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { fallbackLinksOf } from './fallback-links.util.ts';
import { fallbackRowsOf } from './fallback-rows.util.ts';
import { edgeOf, fallbackGraphOf } from '../test/utils/fallback-graph.spec.util.ts';

const rowNamesOf = (names: string[], edges: ElkEdge[]): string[][] => {
  const links = fallbackLinksOf(fallbackGraphOf(names, edges));
  const nameAt = (index: number): string => names[index] ?? '';

  return fallbackRowsOf(links).map((row: number[]): string[] => row.map(nameAt));
};

const TWELVE_ROOTS = Array.from({ length: 12 }, (_: unknown, index: number): string => `r${index}`);

describe('FEATURE: fallbackRowsOf', () => {
  describe('GIVEN a pure cycle c <> d next to a > b', () => {
    it('WHEN rows are built THEN the cycle is the top row', () => {
      const rows = rowNamesOf(['a', 'b', 'c', 'd'], [edgeOf('a', 'b'), edgeOf('c', 'd'), edgeOf('d', 'c')]);

      expect(rows).toStrictEqual([['c', 'd'], ['a'], ['b']]);
    });
  });

  describe('GIVEN e under a root-less cycle c <> d, next to a > b', () => {
    it('WHEN rows are built THEN e joins the top row in index order', () => {
      const edges = [edgeOf('a', 'b'), edgeOf('c', 'd'), edgeOf('d', 'c'), edgeOf('d', 'e')];

      const rows = rowNamesOf(['a', 'b', 'c', 'd', 'e'], edges);

      expect(rows).toStrictEqual([['c', 'd', 'e'], ['a'], ['b']]);
    });
  });

  describe('GIVEN roots a, b with b > y, b > z, and z also under a root-less cycle c <> d', () => {
    it('WHEN rows are built THEN the unreached d does not pull z left of y', () => {
      const edges = [edgeOf('b', 'y'), edgeOf('b', 'z'), edgeOf('c', 'd'), edgeOf('d', 'c'), edgeOf('d', 'z')];

      const rows = rowNamesOf(['a', 'b', 'y', 'z', 'c', 'd'], edges);

      expect(rows).toStrictEqual([
        ['c', 'd'],
        ['a', 'b'],
        ['y', 'z']
      ]);
    });
  });

  describe('GIVEN 12 unconnected roots', () => {
    it('WHEN rows are built THEN they sort by the index as text: 0, 1, 10, 11, 2, …', () => {
      const rows = rowNamesOf(TWELVE_ROOTS, []);

      const expected = ['r0', 'r1', 'r10', 'r11', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'];

      expect(rows).toStrictEqual([expected]);
    });
  });

  describe('GIVEN roots a, b with children a > x and b > y, y listed before x', () => {
    it('WHEN rows are built THEN the right-hand parent child sorts right', () => {
      const rows = rowNamesOf(['a', 'b', 'y', 'x'], [edgeOf('a', 'x'), edgeOf('b', 'y')]);

      expect(rows).toStrictEqual([
        ['a', 'b'],
        ['x', 'y']
      ]);
    });
  });

  describe('GIVEN a self-looped a > a with a > b', () => {
    it('WHEN rows are built THEN a stays a root', () => {
      const rows = rowNamesOf(['a', 'b'], [edgeOf('a', 'a'), edgeOf('a', 'b')]);

      expect(rows).toStrictEqual([['a'], ['b']]);
    });
  });

  describe('GIVEN a > b > c and a shortcut a > c', () => {
    it('WHEN rows are built THEN c takes the shortest depth, next to b', () => {
      const rows = rowNamesOf(['a', 'b', 'c'], [edgeOf('a', 'b'), edgeOf('b', 'c'), edgeOf('a', 'c')]);

      expect(rows).toStrictEqual([['a'], ['b', 'c']]);
    });
  });

  describe('GIVEN an empty graph', () => {
    it('WHEN rows are built THEN there are none', () => {
      const rows = rowNamesOf([], []);

      expect(rows).toStrictEqual([]);
    });
  });
});
