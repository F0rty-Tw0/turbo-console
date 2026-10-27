import type { PanelWidths } from '../../bridge/common/graph-view-state.type.ts';

/** The panel a sash resizes. */
export type PanelSide = 'controls' | 'details';

/** The two sashes `buildPanelSashes` makes: the Controls one sits on the Controls panel's inner edge, the Details one on the Details panel's. */
export type PanelSashes = {
  readonly controls: HTMLDivElement;
  readonly details: HTMLDivElement;
};

/** Where the saved panel widths live: `ViewStateModes`, which saves them once per page. */
type PanelWidthStore = {
  readonly panelWidths: () => PanelWidths | null;
  readonly savePanelWidths: (widths: PanelWidths) => void;
};

/** What a sash's input drives: `GraphPanelSashes`. */
export type SashResizer = {
  /** The width `side`'s panel is drawn at. */
  readonly widthOf: (side: PanelSide) => number;
  /** The widest `side` goes to, the other side giving way first. */
  readonly maxOf: (side: PanelSide) => number;
  /** Draws `side` at `px` (clamped), the other side giving way first; saves nothing. */
  readonly resize: (side: PanelSide, px: number) => void;
  /** Saves the preferred widths. */
  readonly commit: () => void;
  /** Draws `side` at its default width and saves. */
  readonly reset: (side: PanelSide) => void;
};

export type PanelSashDeps = {
  readonly root: HTMLElement;
  /** `div.graph-body`: carries the width variables, and its width is what the panels are clamped to. */
  readonly body: HTMLElement;
  readonly sashes: PanelSashes;
  /** `window.matchMedia(OVERLAY_MEDIA_QUERY)`: while it matches, Details floats over the canvas. */
  readonly overlay: MediaQueryList;
  readonly store: PanelWidthStore;
};
