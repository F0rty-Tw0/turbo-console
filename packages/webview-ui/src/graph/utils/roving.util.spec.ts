import { describe, expect, it } from 'vitest';

import { nextCell } from './roving.util.ts';
import type { CellAt, Column, ListLine } from '../common/roving.type.ts';

const LINES: ListLine[] = [{ kind: 'header' }, { kind: 'row' }, { kind: 'row' }, { kind: 'header' }, { kind: 'row' }];

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
