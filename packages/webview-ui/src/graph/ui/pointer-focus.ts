import { POINTER_FOCUS_CLASS } from '../common/graph.const.ts';

/**
 * Marks `container` while the last input was a pointer press: the class goes on at any `pointerdown` on `doc` and off
 * at any `keydown`. Script focus after a press (a tap focuses the container) still counts as keyboard focus to the
 * browser, so the class lets the CSS drop that ring until a key is pressed. Capture phase, so a handler that stops the
 * event cannot hide the press.
 */
export const trackPointerFocus = (container: HTMLElement, doc: EventTarget = document): void => {
  doc.addEventListener('pointerdown', (): void => container.classList.add(POINTER_FOCUS_CLASS), true);
  doc.addEventListener('keydown', (): void => container.classList.remove(POINTER_FOCUS_CLASS), true);
};
