import type { CellAt, Column, ListLine } from '../common/roving.type.ts';

const COLUMNS: Column[] = ['check', 'name', 'focus'];

const landingColumnOf = (from: ListLine, to: ListLine, at: CellAt, remembered: Column): Column => {
  if (to.kind === 'header') return 'check';

  return from.kind === 'row' ? at.column : remembered;
};

const lineMove = (lines: ListLine[], at: CellAt, target: number, remembered: Column): CellAt | null => {
  const from = lines[at.line];
  const to = lines[target];
  const isMove = target !== at.line;

  if (from === undefined || to === undefined || !isMove) return null;

  const column = landingColumnOf(from, to, at, remembered);
  const cell: CellAt = { line: target, column };

  return cell;
};

const columnMove = (lines: ListLine[], at: CellAt, step: number): CellAt | null => {
  const line = lines[at.line];

  if (line === undefined || line.kind === 'header') return null;

  const column = COLUMNS[COLUMNS.indexOf(at.column) + step];

  if (column === undefined) return null;

  const cell: CellAt = { line: at.line, column };

  return cell;
};

/** Where `key` moves the focused cell, or `null` when it moves nothing and the caller leaves the key alone. */
export const nextCell = (lines: ListLine[], at: CellAt, key: string, remembered: Column): CellAt | null => {
  switch (key) {
    case 'ArrowDown':
      return lineMove(lines, at, at.line + 1, remembered);
    case 'ArrowUp':
      return lineMove(lines, at, at.line - 1, remembered);
    case 'Home':
      return lineMove(lines, at, 0, remembered);
    case 'End':
      return lineMove(lines, at, lines.length - 1, remembered);
    case 'ArrowRight':
      return columnMove(lines, at, 1);
    case 'ArrowLeft':
      return columnMove(lines, at, -1);
    default:
      return null;
  }
};
