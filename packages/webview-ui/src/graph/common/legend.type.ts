import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';

/** A theme colour a swatch is drawn in; `run-<state>` is the outline of a task in that run state. */
export type LegendColour =
  'frame' | 'background' | 'edge' | 'selected' | 'highlighted' | 'cached' | 'selectionFill' | `run-${GraphRunState}`;

export type LegendOutline = {
  readonly colour: LegendColour;
  readonly px: number;
};

/** What one swatch draws. `flow`: `stroke`/`strokePx` is the highlighted edge; `dashPx` and `outline` are the dash pen drawn over it. */
export type LegendSwatch = {
  readonly shape: 'box' | 'pill' | 'line' | 'flow';
  readonly stroke: LegendColour;
  readonly strokePx: number;
  readonly dashPx: number[] | null;
  readonly radiusPx: number;
  readonly fill: LegendColour | null;
  readonly outline: LegendOutline | null;
  readonly isArrow: boolean;
  readonly isBold: boolean;
  readonly isDimmed: boolean;
  readonly isNested: boolean;
  readonly hasPlate: boolean;
};

export type LegendRow = {
  readonly id: string;
  readonly text: string;
  readonly swatch: LegendSwatch;
};
