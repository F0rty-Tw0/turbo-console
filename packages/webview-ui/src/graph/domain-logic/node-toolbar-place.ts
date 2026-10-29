import { setHidden, translateOf, writeStyle } from './widget-row-place.ts';
import type { RectPx } from '../common/widget.type.ts';

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

/** Shows a node toolbar's root at `rect` on whole px, or hides it for `null`; focus inside a root that hides goes to `container`. */
export const placeToolbarRoot = (root: HTMLElement, rect: RectPx | null, container: HTMLElement): void => {
  if (rect === null) releaseFocusOf(root, container);

  setHidden(root, rect === null);

  if (rect === null) return;

  writeStyle(root, 'transform', translateOf(rect.x1, rect.y1));
};
