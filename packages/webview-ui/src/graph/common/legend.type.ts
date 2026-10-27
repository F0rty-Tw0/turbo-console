import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';

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

/** One SVG child of a legend swatch: its tag, its attributes, and its text (`''` for all but `text`). */
export type SvgPart = {
  readonly tag: 'rect' | 'line' | 'path' | 'text';
  readonly attrs: Readonly<Record<string, string>>;
  readonly text: string;
};

/** What `buildLegend` builds: the Legend button and the popover it opens. */
export type LegendElements = {
  /** The View group's last button, `info`; `popovertarget` points at `legendPanel`. Disabled until a graph shows. */
  readonly legend: HTMLButtonElement;
  /** `div.graph-legend[popover=auto]`, last child of the toolbar; `role=region`, `aria-labelledby` its heading. */
  readonly legendPanel: HTMLElement;
  /** `dl.legend-list` per mode, filled by `renderLegend`; CSS shows the one for the page's mode. */
  readonly legendLists: Readonly<Record<GraphViewMode, HTMLElement>>;
};
