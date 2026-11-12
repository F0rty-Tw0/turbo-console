import type { Position } from '../../bridge/common/graph-state.type.ts';

/** Where an umbrella sits on the canvas, in model units: its centre and its body's width. */
export type AtomChipBox = {
  readonly centre: Position;
  readonly width: number;
};
