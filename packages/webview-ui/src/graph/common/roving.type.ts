export type Column = 'check' | 'name' | 'focus';

/** One line of the package list: a folder header (one cell) or a package row (three cells). */
export type ListLine = { readonly kind: 'header' | 'row' };

export type CellAt = {
  readonly line: number;
  readonly column: Column;
};
