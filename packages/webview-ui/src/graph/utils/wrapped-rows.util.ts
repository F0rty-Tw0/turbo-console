import type { Position } from '../../bridge/common/graph-state.type.ts';
import { MIN_FALLBACK_COLUMNS } from '../common/graph.const.ts';
import type { Cell } from '../common/wrapped-rows.type.ts';

const depthOf = ([, cell]: Cell): number => cell.y;

const byDepth = ([a]: [number, Cell[]], [b]: [number, Cell[]]): number => a - b;

const byColumn = ([, a]: Cell, [, b]: Cell): number => a.x - b.x;

/** The cells of one depth band, left to right, `columns` to a sub-row from `top` down, each sub-row centred on 0. */
const bandCellsOf = (band: Cell[], top: number, columns: number): Cell[] => {
  const cellAt = ([id]: Cell, order: number): Cell => {
    const subRow = Math.floor(order / columns);
    const rowStart = subRow * columns;
    const rowLength = Math.min(columns, band.length - rowStart);
    const cell: Position = { x: order - rowStart - (rowLength - 1) / 2, y: top + subRow };

    return [id, cell];
  };

  return band.map(cellAt);
};

/** The column count that makes `count` cells of `pitch` about as wide as they are tall; never fewer than `MIN_FALLBACK_COLUMNS`. */
export const squareColumnsOf = (count: number, pitch: Position): number => {
  const columns = Math.ceil(Math.sqrt((count * pitch.y) / pitch.x));

  return Math.max(columns, MIN_FALLBACK_COLUMNS);
};

/**
 * Unit cells (column across, depth down) with every depth row wrapped at `columns`: a row fills sub-rows of its own band
 * in column order, and each band starts below the last, so every node of one depth still sits above the next depth.
 */
export const wrappedCellsOf = (cells: Cell[], columns: number): Cell[] => {
  const groups = Map.groupBy(cells, depthOf);
  const entries = [...groups];
  const bands = entries.sort(byDepth);
  const wrapped: Cell[] = [];
  let top = 0;

  for (const [, band] of bands) {
    const row = band.toSorted(byColumn);
    const placed = bandCellsOf(row, top, columns);

    for (const cell of placed) wrapped.push(cell);

    top += Math.ceil(row.length / columns);
  }

  return wrapped;
};
