import type { ControlsElements, ControlsGroup, ControlsRow } from '../common/controls-elements.type.ts';
import { COLUMNS } from '../common/graph.const.ts';
import type { CellAt, Column, GridCells, GridLine } from '../common/roving.type.ts';

const columnsOf = (cells: GridCells): Column[] => COLUMNS.filter((column) => cells[column] !== undefined);

/** A header has the group checkbox, and the Expand or Collapse button while it is not hidden. */
const headerLineOf = (group: ControlsGroup): GridLine => {
  const cells: GridCells = { check: group.check };

  if (!group.toggle.hidden) cells.name = group.toggle;

  const columns = columnsOf(cells);
  const line: GridLine = { kind: 'header', columns, cells, row: null };

  return line;
};

const rowLineOf = (row: ControlsRow): GridLine => {
  const cells: GridCells = { check: row.check, name: row.pick, focus: row.focus };
  const columns = columnsOf(cells);
  const line: GridLine = { kind: 'row', columns, cells, row };

  return line;
};

/** The headers and rows the search leaves in the list, in DOM order. */
export const gridLinesOf = (elements: ControlsElements): GridLine[] => {
  const lines: GridLine[] = [];

  for (const group of elements.groups) {
    if (group.line.hidden) continue;

    const listed = group.rows.filter((row) => !row.line.hidden);
    const header = headerLineOf(group);
    const rowLines = listed.map(rowLineOf);

    lines.push(header, ...rowLines);
  }

  return lines;
};

export const cellAtOf = (lines: GridLine[], target: EventTarget | null): CellAt | null => {
  for (const [line, gridLine] of lines.entries()) {
    const column = COLUMNS.find((candidate) => gridLine.cells[candidate] === target);

    if (column === undefined) continue;

    const at: CellAt = { line, column };

    return at;
  }

  return null;
};

export const elementAt = (lines: GridLine[], at: CellAt): HTMLElement | undefined => lines[at.line]?.cells[at.column];
