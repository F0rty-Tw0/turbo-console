import { describe, expect, it } from 'vitest';

import { enterActionOf, entryCellOf, firstSelectableOf } from './list-keys.util.ts';
import type { CellAt, Column, ListLine } from '../common/roving.type.ts';

const HEADER_FLAT: ListLine = { kind: 'header', columns: ['check'] };

const HEADER_GROUPED: ListLine = { kind: 'header', columns: ['check', 'name'] };

const ROW: ListLine = { kind: 'row', columns: ['check', 'name', 'focus'] };

const LINES: ListLine[] = [HEADER_FLAT, ROW, ROW];

const GROUPED_LINES: ListLine[] = [HEADER_GROUPED, ROW, ROW];

const at = (line: number, column: Column): CellAt => {
  const cell: CellAt = { line, column };

  return cell;
};

describe('FEATURE: entryCellOf', () => {
  describe('GIVEN a header and two rows', () => {
    it('WHEN there is no remembered cell THEN it is the first checkbox', () => {
      const cell = entryCellOf(LINES, null);

      expect(cell).toStrictEqual(at(0, 'check'));
    });

    it('WHEN the remembered line is left out THEN it is the first checkbox', () => {
      const cell = entryCellOf(LINES, at(5, 'focus'));

      expect(cell).toStrictEqual(at(0, 'check'));
    });

    it('WHEN the remembered cell is still there THEN it is kept', () => {
      const cell = entryCellOf(LINES, at(2, 'focus'));

      expect(cell).toStrictEqual(at(2, 'focus'));
    });

    it('WHEN the remembered cell is a name button on a flat header THEN it is the first checkbox', () => {
      const cell = entryCellOf(LINES, at(0, 'name'));

      expect(cell).toStrictEqual(at(0, 'check'));
    });
  });

  describe('GIVEN a grouped header and two rows', () => {
    it('WHEN the remembered cell is the header toggle THEN it is kept', () => {
      const cell = entryCellOf(GROUPED_LINES, at(0, 'name'));

      expect(cell).toStrictEqual(at(0, 'name'));
    });

    it('WHEN the remembered cell is a focus button on the header THEN it is the first checkbox', () => {
      const cell = entryCellOf(GROUPED_LINES, at(0, 'focus'));

      expect(cell).toStrictEqual(at(0, 'check'));
    });
  });

  it('GIVEN no lines WHEN a cell was remembered THEN the list has no entry', () => {
    const cell = entryCellOf([], at(0, 'check'));

    expect(cell).toBeNull();
  });
});

describe('FEATURE: enterActionOf', () => {
  it('GIVEN nothing selected WHEN Enter is on web THEN it selects', () => {
    const action = enterActionOf(null, 'web');

    expect(action).toBe('select');
  });

  it('GIVEN api selected WHEN Enter is on web THEN it selects', () => {
    const action = enterActionOf('api', 'web');

    expect(action).toBe('select');
  });

  it('GIVEN web selected WHEN Enter is on web THEN it opens the details', () => {
    const action = enterActionOf('web', 'web');

    expect(action).toBe('details');
  });
});

describe('FEATURE: firstSelectableOf', () => {
  it('GIVEN b and c visible WHEN the order is a, b, c THEN it is b', () => {
    const name = firstSelectableOf(['a', 'b', 'c'], new Set(['c', 'b']));

    expect(name).toBe('b');
  });

  it('GIVEN nothing visible WHEN the order has a THEN there is none', () => {
    const name = firstSelectableOf(['a'], new Set());

    expect(name).toBeNull();
  });

  it('GIVEN __proto__ visible WHEN the order is __proto__ THEN it is __proto__', () => {
    const name = firstSelectableOf(['__proto__'], new Set(['__proto__']));

    expect(name).toBe('__proto__');
  });
});
