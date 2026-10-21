import type { CellAt, ListLine } from '../common/roving.type.ts';

const FIRST_CELL: CellAt = { line: 0, column: 'check' };

/** Where Tab enters the list: the remembered cell while its line is still listed, else the first line's checkbox. */
export const entryCellOf = (lines: ListLine[], at: CellAt | null): CellAt | null => {
  if (lines.length === 0) return null;

  const line = at === null ? undefined : lines[at.line];

  if (at === null || line === undefined) return FIRST_CELL;

  const isMissingCell = line.kind === 'header' && at.column !== 'check';

  return isMissingCell ? FIRST_CELL : at;
};

/** Enter on a name button opens the details of the package that is already selected, else selects it. */
export const enterActionOf = (selected: string | null, name: string): 'select' | 'details' => {
  return selected === name ? 'details' : 'select';
};

/** The first of `order` that is in `visible`, or `null`. */
export const firstSelectableOf = (order: string[], visible: ReadonlySet<string>): string | null => {
  const name = order.find((candidate) => visible.has(candidate));

  return name ?? null;
};
