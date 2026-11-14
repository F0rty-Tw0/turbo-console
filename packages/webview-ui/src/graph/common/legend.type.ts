import type { ThemeColors } from './theme-colors.type.ts';
import type { GraphAffected } from '../../bridge/common/graph-affected.type.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';

/** A theme colour a swatch is drawn in; `run-<state>` is the outline of a file or the bar of a card in that run state. */
export type LegendColour =
  | 'frame'
  | 'background'
  | 'edge'
  | 'selected'
  | 'highlighted'
  | 'cached'
  | 'selectionFill'
  | 'affected'
  | 'cardFill'
  | 'cardFrame'
  | `run-${GraphRunState}`;

export type LegendOutline = {
  readonly colour: LegendColour;
  readonly px: number;
};

/** The affected halo under a task box, as the stylesheet's `underlay` draws it. */
export type LegendHalo = {
  readonly colour: 'affected';
  readonly opacity: number;
};

/** A swatch rect's left edge, top edge, width and corner radius in viewBox units, as the accent bar follows them. */
export type AccentBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly rx: number;
};

/**
 * What one swatch draws. `flow`: `stroke`/`strokePx` is the highlighted edge; `dashPx` and `outline` are the dash pen drawn over it.
 * `halo`: a box's affected halo, drawn under the outline and the frame.
 * `accentBar`: the run colour of a card's top bar, drawn over the frame's top edge; `null` for no bar.
 */
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
  readonly halo: LegendHalo | null;
  readonly accentBar: LegendColour | null;
};

/** Draws the legend in `colors`, with the affected rows of `affected`'s level, or none for `null`. */
export type LegendRender = (colors: ThemeColors, affected: GraphAffected['mode'] | null) => void;

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
