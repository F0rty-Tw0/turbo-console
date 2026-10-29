import { writeStops } from './roving-stop.ts';
import { setHidden, translateOf, writeStyle } from './widget-row-place.ts';
import type { RectPx, RovingEntry } from '../common/widget.type.ts';
import { kindIn } from '../utils/roving-stop.util.ts';

/** Hands the focus to `container` when it is inside `root`, since the browser would drop it on the body once `root` goes. */
export const releaseFocusOf = (root: HTMLElement, container: HTMLElement): void => {
  const hasFocus = root.contains(root.ownerDocument.activeElement);

  if (hasFocus) container.focus();
};

/** Removes a node toolbar's `root` from its layer; focus inside it goes to `container` first, since the browser would drop it on the body. */
export const removeToolbarRoot = (root: HTMLElement, container: HTMLElement): void => {
  releaseFocusOf(root, container);
  root.remove();
};

/** Shows a node toolbar's root at `rect` on whole px, or hides it for `null`; focus inside a root that hides goes to `container`, so a root already hidden reads no focus. */
export const placeToolbarRoot = (root: HTMLElement, rect: RectPx | null, container: HTMLElement): void => {
  if (rect === null && !root.hidden) releaseFocusOf(root, container);

  setHidden(root, rect === null);

  if (rect === null) return;

  writeStyle(root, 'transform', translateOf(rect.x1, rect.y1));
};

/** Shows the buttons of `order` that `shown` holds, with `stop` the one Tab stop; whether focus was on a button it hid, read before hiding. */
export const writeShown = <TKind extends string>(entry: RovingEntry<TKind>, order: TKind[], shown: TKind[], stop: TKind): boolean => {
  const { elements } = entry;
  const activeKind = kindIn(order, elements, document.activeElement);
  const isLostFocus = activeKind !== undefined && !shown.includes(activeKind);

  for (const kind of order) {
    const button = elements[kind];

    if (button !== null) setHidden(button, !shown.includes(kind));
  }

  entry.shown = shown;
  writeStops(order, elements, stop);

  return isLostFocus;
};
