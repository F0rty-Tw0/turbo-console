import { COLUMNS } from '../common/graph.const.ts';
import type { CellAt, Column, ListLine } from '../common/roving.type.ts';

/** The column kept when `to` has it, else the last of its columns at or before it in `COLUMNS`, else its first. */
const landingColumnOf = (from: ListLine, to: ListLine, at: CellAt, remembered: Column): Column | undefined => {
  const wanted = from.columns.length === 1 ? remembered : at.column;

  const isKept = to.columns.includes(wanted);

  if (isKept) return wanted;

  const wantedIndex = COLUMNS.indexOf(wanted);
  const isAtOrBefore = (column: Column): boolean => COLUMNS.indexOf(column) <= wantedIndex;
  const before = to.columns.filter(isAtOrBefore);

  return before.at(-1) ?? to.columns[0];
};

const lineMove = (lines: ListLine[], at: CellAt, target: number, remembered: Column): CellAt | null => {
  const from = lines[at.line];
  const to = lines[target];
  const isMove = target !== at.line;

  if (from === undefined || to === undefined || !isMove) return null;

  const column = landingColumnOf(from, to, at, remembered);

  if (column === undefined) return null;

  const cell: CellAt = { line: target, column };

  return cell;
};

const columnMove = (lines: ListLine[], at: CellAt, step: number): CellAt | null => {
  const line = lines[at.line];
  const index = line?.columns.indexOf(at.column) ?? -1;

  if (line === undefined || index === -1) return null;

  const column = line.columns[index + step];

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
