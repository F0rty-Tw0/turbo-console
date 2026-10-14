import type { RowCommand } from './tree-row.type.ts';

/** One row of a fixed view: its label, its codicon id and the command a click runs. */
export type FixedItem = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly command: RowCommand;
};

/** The public face of `FixedViewProvider`, so `common/` can name it without importing the feature. */
export type FixedViewApi = {
  readonly getChildren: (item?: FixedItem) => FixedItem[];
};
