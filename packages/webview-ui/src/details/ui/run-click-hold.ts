import { RUN_SWAP_HOLD_MS } from '../common/run-view.const.ts';

const RUN_BUTTON = '.run-slot button';

/** Each swapped-in Run/Stop button and the `performance.now()` until which it ignores every click. */
const fullHolds = new WeakMap<HTMLButtonElement, number>();

/** The `performance.now()` until which every Run/Stop button ignores pointer clicks. */
let pointerHeldUntil = 0;

/** The viewport size when the last pointer hold started, or when the hold was installed. */
let seenViewportSize = '';

const holdEnd = (): number => performance.now() + RUN_SWAP_HOLD_MS;

const viewportSize = (): string => `${String(innerWidth)}x${String(innerHeight)}`;

/**
 * Ignores pointer clicks on every Run/Stop button for `RUN_SWAP_HOLD_MS` from now. A layout shift can slide another
 * card's Run or Stop under a resting pointer, and a double-click's second click lands there. Keyboard clicks stay live:
 * a layout shift does not move focus and a held mouse press does not take it, so a focused button is still the one the
 * user chose.
 */
export const holdPointerClicks = (): void => {
  pointerHeldUntil = holdEnd();
  seenViewportSize = viewportSize();
};

/**
 * Ignores every click on the Run/Stop button `button` swapped in, keyboard ones included, for `RUN_SWAP_HOLD_MS`: a
 * click meant for the old button would relaunch a stopped run or stop a fresh one. Other Run/Stop buttons stay live: a
 * swap changes only its own card's status and button, and the resize that can come with a run's end holds them itself.
 */
export const holdSwappedButton = (button: HTMLButtonElement): void => {
  fullHolds.set(button, holdEnd());
};

/** A click can land on the new layout of a resize before the next frame fires its `resize` event, so it holds first. */
const isPointerHeld = (): boolean => {
  const size = viewportSize();
  const isUnseenResize = size !== seenViewportSize;

  if (isUnseenResize) holdPointerClicks();

  const isHeld = performance.now() < pointerHeldUntil;

  return isHeld;
};

/** A pointer click carries its click count in `detail`; Enter or Space on a button clicks with `detail` 0. */
const isHeldClick = (button: HTMLButtonElement, event: MouseEvent): boolean => {
  const fullHeldUntil = fullHolds.get(button) ?? 0;
  const isFullHeld = performance.now() < fullHeldUntil;
  const isPointerClick = event.detail > 0;
  const isPointerHeldNow = isPointerHeld();
  const isHeldPointerClick = isPointerClick && isPointerHeldNow;

  return isFullHeld || isHeldPointerClick;
};

const runButtonOf = (event: MouseEvent): HTMLButtonElement | null => {
  const target = event.target;

  if (!(target instanceof Element)) return null;

  const button = target.closest(RUN_BUTTON);

  return button instanceof HTMLButtonElement ? button : null;
};

const dropHeldClick = (event: MouseEvent): void => {
  const button = runButtonOf(event);

  if (button === null) return;

  const isHeld = isHeldClick(button, event);

  if (isHeld) event.stopImmediatePropagation();
};

/** A held mouse press would focus the Run/Stop button that slid under the pointer, and a later Enter would click it. */
const keepFocusOffHeldPress = (event: MouseEvent): void => {
  const button = runButtonOf(event);

  if (button === null) return;

  const isHeld = isPointerHeld();

  if (isHeld) event.preventDefault();
};

/**
 * Drops held clicks before any Run/Stop button sees them: a document capture listener runs before the button's own
 * click listener. A held mouse press also leaves focus where it is. A page resize, such as VS Code closing the terminal
 * panel when a run ends, holds pointer clicks, since it can shift the layout before the runState that would hold them
 * arrives. The trade-off: a pointer click on any Run/Stop button is ignored for `RUN_SWAP_HOLD_MS` after a re-render or
 * a resize, and any click on a swapped-in one after its swap.
 */
export const installRunClickHold = (): void => {
  seenViewportSize = viewportSize();
  document.addEventListener('mousedown', keepFocusOffHeldPress, true);
  document.addEventListener('click', dropHeldClick, true);
  addEventListener('resize', holdPointerClicks);
};
