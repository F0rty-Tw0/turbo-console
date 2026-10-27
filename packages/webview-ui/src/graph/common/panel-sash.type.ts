import type { PanelWidths } from '../../bridge/common/graph-view-state.type.ts';

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

export type PanelSashDeps = {
  readonly root: HTMLElement;
  /** `div.graph-body`: carries the width variables, and its width is what the panels are clamped to. */
  readonly body: HTMLElement;
  readonly sashes: PanelSashes;
  /** `window.matchMedia(OVERLAY_MEDIA_QUERY)`: while it matches, Details floats over the canvas. */
  readonly overlay: MediaQueryList;
  readonly store: PanelWidthStore;
};
