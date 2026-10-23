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

/**
 * Runs in the page through `evaluate`: a mouse-only drag `move.amount` px right from `move.point`, the mousedown on the
 * canvas there and the moves and mouseup on the window, as Cytoscape listens (it ignores a mousedown on its container
 * itself). No `pointerdown` fires, so only the camera move it pans by can close an open widget menu.
 */
export const mouseDragAt = (container: Element, move: SyntheticMove): void => {
  const { point, amount } = move;
  const target = document.elementFromPoint(point.x, point.y) ?? container;
  const mouseAt = (type: string, x: number): MouseEvent => {
    const init: MouseEventInit = { clientX: x, clientY: point.y, button: 0, buttons: 1, bubbles: true, cancelable: true };

    return new MouseEvent(type, init);
  };
  const down = mouseAt('mousedown', point.x);
  const steps = [0.25, 0.5, 0.75, 1];

  target.dispatchEvent(down);

  for (const step of steps) {
    const moved = mouseAt('mousemove', point.x + amount * step);

    window.dispatchEvent(moved);
  }

  const up = mouseAt('mouseup', point.x + amount);

  window.dispatchEvent(up);
};
