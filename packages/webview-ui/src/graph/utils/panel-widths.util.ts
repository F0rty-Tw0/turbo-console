import type { PanelWidths } from '../../bridge/common/graph-view-state.type.ts';
import type { PanelSide } from '../common/graph-page.type.ts';
import { CANVAS_MIN_PX, PANEL_MIN_PX } from '../common/graph.const.ts';

type SidePair = { readonly first: number; readonly other: number };

const within = (px: number, cap: number): number => Math.max(PANEL_MIN_PX, Math.min(Math.round(px), cap));

/** `first` gives up `over` px down to the minimum, then `other` gives up what is left, never under the minimum. */
const shrunkBy = (first: number, other: number, over: number): SidePair => {
  const firstCut = Math.min(over, first - PANEL_MIN_PX);
  const otherCut = Math.min(over - firstCut, other - PANEL_MIN_PX);
  const pair: SidePair = { first: first - firstCut, other: other - otherCut };

  return pair;
};

const dockedWidthsOf = (widths: PanelWidths, over: number, dragged: PanelSide | null): PanelWidths => {
  const isControlsFirst = dragged !== 'controls';

  if (isControlsFirst) {
    const shrunk = shrunkBy(widths.controls, widths.details, over);
    const controlsFirst: PanelWidths = { controls: shrunk.first, details: shrunk.other };

    return controlsFirst;
  }

  const shrunk = shrunkBy(widths.details, widths.controls, over);
  const detailsFirst: PanelWidths = { controls: shrunk.other, details: shrunk.first };

  return detailsFirst;
};

/**
 * The widths drawn for the `preferred` ones in a body `bodyWidth` px wide. Each side is at least the minimum and at most half
 * the body; docked, the pair also leaves the canvas its minimum, the side not `dragged` shrinking first (Controls with no drag).
 * The minimum beats the cap and the sum. Overlay, Details floats over the canvas, so only Controls counts against the budget.
 */
export const clampedWidthsOf = (
  preferred: PanelWidths,
  bodyWidth: number,
  isOverlay: boolean,
  dragged: PanelSide | null
): PanelWidths => {
  const cap = Math.floor(bodyWidth / 2);
  const budget = bodyWidth - CANVAS_MIN_PX;
  const controls = within(preferred.controls, cap);
  const details = within(preferred.details, cap);

  if (isOverlay) {
    const overlayControls = Math.max(PANEL_MIN_PX, Math.min(controls, budget));
    const overlay: PanelWidths = { controls: overlayControls, details };

    return overlay;
  }

  const over = controls + details - budget;

  if (over <= 0) {
    const fits: PanelWidths = { controls, details };

    return fits;
  }

  return dockedWidthsOf({ controls, details }, over, dragged);
};

/** The widest `side` drags to: the other side shrinks first, as in a drag. */
export const maxWidthOf = (side: PanelSide, preferred: PanelWidths, bodyWidth: number, isOverlay: boolean): number => {
  const widest: PanelWidths = { ...preferred, [side]: Number.MAX_SAFE_INTEGER };
  const clamped = clampedWidthsOf(widest, bodyWidth, isOverlay, side);

  return clamped[side];
};
