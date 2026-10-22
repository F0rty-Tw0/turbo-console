import { describe, expect, it } from 'vitest';

import { nextCell } from './roving.util.ts';
import type { CellAt, Column, ListLine } from '../common/roving.type.ts';

const HEADER_FLAT: ListLine = { kind: 'header', columns: ['check'] };

const HEADER_GROUPED: ListLine = { kind: 'header', columns: ['check', 'name', 'focus'] };

const ROW: ListLine = { kind: 'row', columns: ['check', 'name', 'focus'] };

const LINES: ListLine[] = [HEADER_FLAT, ROW, ROW, HEADER_FLAT, ROW];

const GROUPED_LINES: ListLine[] = [HEADER_GROUPED, ROW, ROW, HEADER_GROUPED, ROW];

const NAME_ONLY_LINES: ListLine[] = [HEADER_FLAT, { kind: 'row', columns: ['name', 'focus'] }, { kind: 'row', columns: [] }];

const at = (line: number, column: Column): CellAt => {
  const cell: CellAt = { line, column };

  return cell;
};

type MoveCase = [string, CellAt, Column, CellAt | null];

const MOVES: MoveCase[] = [
  ['ArrowDown', at(1, 'focus'), 'name', at(2, 'focus')],
  ['ArrowDown', at(2, 'focus'), 'name', at(3, 'check')],
  ['ArrowDown', at(3, 'check'), 'focus', at(4, 'focus')],
  ['ArrowDown', at(4, 'name'), 'name', null],
  ['ArrowUp', at(1, 'name'), 'name', at(0, 'check')],
  ['ArrowUp', at(3, 'check'), 'focus', at(2, 'focus')],
  ['ArrowUp', at(0, 'check'), 'name', null],
  ['Home', at(4, 'focus'), 'focus', at(0, 'check')],
  ['Home', at(0, 'check'), 'name', null],
  ['End', at(1, 'name'), 'name', at(4, 'name')],
  ['End', at(0, 'check'), 'focus', at(4, 'focus')],
  ['End', at(4, 'focus'), 'focus', null],
  ['ArrowRight', at(1, 'check'), 'name', at(1, 'name')],
  ['ArrowRight', at(1, 'name'), 'name', at(1, 'focus')],
  ['ArrowRight', at(1, 'focus'), 'focus', null],
  ['ArrowRight', at(0, 'check'), 'name', null],
  ['ArrowRight', at(0, 'focus'), 'name', null],
  ['ArrowLeft', at(1, 'focus'), 'focus', at(1, 'name')],
  ['ArrowLeft', at(1, 'name'), 'name', at(1, 'check')],
  ['ArrowLeft', at(1, 'check'), 'name', null],
  ['ArrowLeft', at(3, 'check'), 'name', null],
  [' ', at(1, 'name'), 'name', null],
  ['Enter', at(1, 'name'), 'name', null],
  ['Tab', at(1, 'name'), 'name', null]
];

describe('FEATURE: nextCell', () => {
  describe('GIVEN a list of header, row, row, header, row', () => {
    it.each(MOVES)('WHEN %j is pressed from %j with %s remembered THEN the move is %j', (key, from, remembered, expected) => {
      const cell = nextCell(LINES, from, key, remembered);

      expect(cell).toStrictEqual(expected);
    });

    it('WHEN ArrowUp is pressed from a line past the end THEN there is no move', () => {
      const cell = nextCell(LINES, at(9, 'name'), 'ArrowUp', 'name');

      expect(cell).toBeNull();
    });
  });

  describe('GIVEN a list of grouped headers and rows', () => {
    const GROUPED_MOVES: MoveCase[] = [
      ['ArrowRight', at(0, 'check'), 'name', at(0, 'name')],
      ['ArrowRight', at(0, 'name'), 'name', at(0, 'focus')],
      ['ArrowRight', at(0, 'focus'), 'focus', null],
      ['ArrowLeft', at(0, 'focus'), 'focus', at(0, 'name')],
      ['ArrowLeft', at(0, 'check'), 'name', null],
      ['ArrowDown', at(0, 'focus'), 'focus', at(1, 'focus')],
      ['ArrowDown', at(0, 'name'), 'name', at(1, 'name')],
      ['ArrowUp', at(1, 'focus'), 'focus', at(0, 'focus')],
      ['ArrowUp', at(1, 'name'), 'name', at(0, 'name')],
      ['ArrowDown', at(2, 'focus'), 'focus', at(3, 'focus')],
      ['Home', at(4, 'focus'), 'focus', at(0, 'focus')],
      ['End', at(0, 'check'), 'focus', at(4, 'check')]
    ];

    it.each(GROUPED_MOVES)('WHEN %j is pressed from %j with %s remembered THEN the move is %j', (key, from, remembered, expected) => {
      const cell = nextCell(GROUPED_LINES, from, key, remembered);

      expect(cell).toStrictEqual(expected);
    });
  });

  describe('GIVEN a flat header with one column', () => {
    it('WHEN ArrowRight is pressed on it THEN there is no move', () => {
      const cell = nextCell(LINES, at(0, 'check'), 'ArrowRight', 'name');

      expect(cell).toBeNull();
    });

    it('WHEN ArrowDown is pressed from it with focus remembered THEN focus on the next row is reached', () => {
      const cell = nextCell(LINES, at(0, 'check'), 'ArrowDown', 'focus');

      expect(cell).toStrictEqual(at(1, 'focus'));
    });
  });

  describe('GIVEN lines whose columns do not include the one wanted', () => {
    it('WHEN the target line starts after the wanted column THEN it lands on the first column', () => {
      const cell = nextCell(NAME_ONLY_LINES, at(0, 'check'), 'ArrowDown', 'check');

      expect(cell).toStrictEqual(at(1, 'name'));
    });

    it('WHEN the target line has no columns THEN there is no move', () => {
      const cell = nextCell(NAME_ONLY_LINES, at(1, 'name'), 'ArrowDown', 'name');

      expect(cell).toBeNull();
    });
  });

  describe('GIVEN an empty list', () => {
    it.each([['ArrowDown'], ['ArrowUp'], ['Home'], ['End'], ['ArrowLeft'], ['ArrowRight']])(
      'WHEN %s is pressed THEN there is no move',
      (key) => {
        const cell = nextCell([], at(0, 'check'), key, 'name');

        expect(cell).toBeNull();
      }
    );
  });
});
