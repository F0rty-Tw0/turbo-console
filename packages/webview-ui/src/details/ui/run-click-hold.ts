import { RUN_SWAP_HOLD_MS } from '../common/run-view.const.ts';

const RUN_BUTTON = '.run-slot button';

/** Each swapped-in Run/Stop button and the `performance.now()` until which it ignores every click. */
const fullHolds = new WeakMap<HTMLButtonElement, number>();

/** The `performance.now()` until which every Run/Stop button ignores pointer clicks. */
let pointerHeldUntil = 0;

const holdEnd = (): number => performance.now() + RUN_SWAP_HOLD_MS;

/**
 * Ignores pointer clicks on every Run/Stop button for `RUN_SWAP_HOLD_MS`, extending a hold already running. A layout
 * shift can slide another card's Run or Stop under a resting pointer, and a double-click's second click lands there.
 * Keyboard clicks stay live: focus does not move with the layout, so a focused button is still the one the user chose.
 */
export const holdPointerClicks = (): void => {
  pointerHeldUntil = Math.max(pointerHeldUntil, holdEnd());
};

/**
 * Ignores every click on the Run/Stop button `button` swapped in, keyboard ones included, and pointer clicks on every
 * other Run/Stop button, for `RUN_SWAP_HOLD_MS`: a click meant for the old button would relaunch a stopped run or stop
 * a fresh one.
 */
export const holdSwappedButton = (button: HTMLButtonElement): void => {
  fullHolds.set(button, holdEnd());
  holdPointerClicks();
};

/** A pointer click carries its click count in `detail`; Enter or Space on a button clicks with `detail` 0. */
const isHeldClick = (button: HTMLButtonElement, event: MouseEvent): boolean => {
  const now = performance.now();
  const fullHeldUntil = fullHolds.get(button) ?? 0;
  const isPointerClick = event.detail > 0;
  const isPointerHeld = isPointerClick && now < pointerHeldUntil;

  return now < fullHeldUntil || isPointerHeld;
};

const dropHeldClick = (event: MouseEvent): void => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const button = target.closest(RUN_BUTTON);

  if (!(button instanceof HTMLButtonElement)) return;

  const isHeld = isHeldClick(button, event);

  if (isHeld) event.stopImmediatePropagation();
};

/**
 * Drops held clicks before any Run/Stop button sees them: a document capture listener runs before the button's own
 * click listener. A page resize, such as VS Code closing the terminal panel when a run ends, holds pointer clicks,
 * since it can shift the layout before the runState that would hold them arrives. The trade-off: a pointer click on
 * any Run/Stop button is ignored for `RUN_SWAP_HOLD_MS` after a swap, a re-render or a resize.
 */
export const installRunClickHold = (): void => {
  document.addEventListener('click', dropHeldClick, true);
  addEventListener('resize', holdPointerClicks);
};
