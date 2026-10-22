import type { ControlsRow } from './controls-elements.type.ts';

export type Column = 'check' | 'name' | 'focus';

/** One line of the package list: a folder header or a package row, and the cells it has, left to right. */
export type ListLine = { readonly kind: 'header' | 'row'; readonly columns: Column[] };

export type CellAt = {
  readonly line: number;
  readonly column: Column;
};

export type GridCells = Partial<Record<Column, HTMLElement>>;

/** A listed line with its cells; `row` is null for a group header. */
export type GridLine = {
  readonly kind: ListLine['kind'];
  readonly columns: Column[];
  readonly cells: GridCells;
  readonly row: ControlsRow | null;
};
