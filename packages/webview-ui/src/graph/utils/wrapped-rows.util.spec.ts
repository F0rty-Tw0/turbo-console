import { describe, expect, it } from 'vitest';

import { squareColumnsOf, wrappedCellsOf } from './wrapped-rows.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

const cellOf = (id: string, x: number, y: number): [string, Position] => [id, { x, y }];

describe('FEATURE: wrapped rows', () => {
  describe('GIVEN a node count and a cell pitch', () => {
    it('WHEN the pitch is square THEN the columns are the square root of the count', () => {
      const columns = squareColumnsOf(100, { x: 10, y: 10 });

      expect(columns).toBe(10);
    });

    it('WHEN cells are four times wider than tall THEN half as many columns are used', () => {
      const columns = squareColumnsOf(100, { x: 40, y: 10 });

      expect(columns).toBe(5);
    });

    it('WHEN the count has no whole root THEN the columns round up', () => {
      const columns = squareColumnsOf(10, { x: 10, y: 10 });

      expect(columns).toBe(4);
    });

    it('WHEN there are no nodes THEN one column is used', () => {
      const columns = squareColumnsOf(0, { x: 10, y: 10 });

      expect(columns).toBe(1);
    });
  });

  describe('GIVEN a depth row of five cells out of column order and a depth row of one below it', () => {
    const cells = [
      cellOf('c', 3, 1),
      cellOf('a', 1, 1),
      cellOf('e', 5, 1),
      cellOf('b', 2, 1),
      cellOf('d', 4, 1),
      cellOf('z', 1, 2)
    ];

    it('WHEN wrapped at two columns THEN the first row fills three centred sub-rows left to right and the next depth starts below them', () => {
      const wrapped = wrappedCellsOf(cells, 2);

      expect(wrapped).toStrictEqual([
        cellOf('a', -0.5, 0),
        cellOf('b', 0.5, 0),
        cellOf('c', -0.5, 1),
        cellOf('d', 0.5, 1),
        cellOf('e', 0, 2),
        cellOf('z', 0, 3)
      ]);
    });

    it('WHEN wrapped at more columns than the widest row THEN each depth keeps one row', () => {
      const wrapped = wrappedCellsOf(cells, 8);

      const rows = wrapped.map(([, cell]): number => cell.y);

      expect(rows).toStrictEqual([0, 0, 0, 0, 0, 1]);
    });
  });

  describe('GIVEN depth rows listed deepest first', () => {
    const cells = [cellOf('low', 0, 9), cellOf('high', 0, 4)];

    it('WHEN wrapped THEN the shallower depth still comes first', () => {
      const wrapped = wrappedCellsOf(cells, 1);

      expect(wrapped).toStrictEqual([cellOf('high', 0, 0), cellOf('low', 0, 1)]);
    });
  });

  describe('GIVEN no cells', () => {
    it('WHEN wrapped THEN there are none', () => {
      const wrapped = wrappedCellsOf([], 3);

      expect(wrapped).toStrictEqual([]);
    });
  });
});
