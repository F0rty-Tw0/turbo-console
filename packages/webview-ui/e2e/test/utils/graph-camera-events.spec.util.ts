import type { SyntheticMove } from '../../common/playwright.type.ts';

/**
 * Runs in the page through `evaluate`: one line-mode wheel event of `move.amount` lines at `move.point`. Before
 * Cytoscape has sampled four wheel deltas it zooms by `10^(−33 · lines / 250)` in this single step.
 */
export const wheelLinesAt = (container: Element, move: SyntheticMove): void => {
  const init: WheelEventInit = {
    deltaY: move.amount,
    deltaMode: WheelEvent.DOM_DELTA_LINE,
    clientX: move.point.x,
    clientY: move.point.y,
    bubbles: true,
    cancelable: true
  };
  const wheel = new WheelEvent('wheel', init);

  container.dispatchEvent(wheel);
};
