import type { Position, Positions } from '../../../bridge/common/graph-state.type.ts';

/** One step of a folder history over the boards fixture: where every package sits, what is shown, ghosted and collapsed. */
export type FolderStep = {
  readonly positions: Positions;
  readonly collapsed: string[];
  readonly visible: string[];
  readonly ghosts: string[];
};

/** What a drawn element shows: its classes sorted, a leaf node's position, the label and count data and its display. */
export type ElementSnapshot = {
  readonly id: string;
  readonly classes: string[];
  readonly position: Position | null;
  readonly label: unknown;
  readonly count: unknown;
  readonly isVisible: boolean;
  readonly display: string;
};
