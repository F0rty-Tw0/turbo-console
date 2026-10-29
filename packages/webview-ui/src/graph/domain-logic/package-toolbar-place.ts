import { setHidden, translateOf, writeStyle } from './widget-row-place.ts';
import type { PackageToolbarElements, PackageToolbarShown, RectPx, ToolbarEntry } from '../common/widget.type.ts';
import { packageToolbarShownOf } from '../utils/package-toolbar.util.ts';
import { isNodeToolbarCompact } from '../utils/widget-geometry.util.ts';

/** One button of the package toolbar and whether the latest pass shows it; a missing Collapse has no button. */
type ToolbarSlot = {
  readonly button: HTMLButtonElement | null;
  readonly isShown: boolean;
};

/** Tab stop 0 on the one stop, -1 on the rest, a write skipped when unchanged. */
const writeTabStop = (button: HTMLButtonElement, isStop: boolean): void => {
  const tabIndex = isStop ? 0 : -1;

  if (button.tabIndex !== tabIndex) button.tabIndex = tabIndex;
};

/** The toolbar's buttons in DOM order with what a pass shows of them. */
const slotsOf = (elements: PackageToolbarElements, shown: PackageToolbarShown): ToolbarSlot[] => {
  const slots: ToolbarSlot[] = [
    { button: elements.focus, isShown: shown.focus },
    { button: elements.startTrace, isShown: shown.startTrace },
    { button: elements.showTasks, isShown: shown.showTasks },
    { button: elements.collapse, isShown: shown.collapse },
    { button: elements.ellipsis, isShown: true }
  ];

  return slots;
};

/** Whether the slot's button is hidden by this pass and holds the focus. */
const isHiddenActive = (slot: ToolbarSlot, active: Element | null): boolean => {
  const isHidden = !slot.isShown;

  return isHidden && slot.button !== null && slot.button === active;
};

/** Shows the buttons the zoom and the state allow with the first shown as the Tab stop; focus left on a hidden one goes to the "…". */
const placeButtons = (entry: ToolbarEntry, zoom: number): void => {
  const { state, folder, elements } = entry;
  const isCompact = isNodeToolbarCompact(zoom);
  const shown = packageToolbarShownOf(state, folder !== null, isCompact);
  const slots = slotsOf(elements, shown);
  const stop = slots.find((slot) => slot.isShown);
  const active = elements.root.ownerDocument.activeElement;
  const isLostFocus = slots.some((slot): boolean => isHiddenActive(slot, active));

  for (const { button, isShown } of slots) {
    if (button === null) continue;

    setHidden(button, !isShown);
    writeTabStop(button, button === stop?.button);
  }

  if (isLostFocus) elements.ellipsis.focus();
};

/** Hands the focus to `container` when it is inside `root`, since the browser would drop it on the body once `root` goes. */
export const releaseFocusOf = (root: HTMLElement, container: HTMLElement): void => {
  const hasFocus = root.contains(root.ownerDocument.activeElement);

  if (hasFocus) container.focus();
};

/** Shows the toolbar at `rect` on whole px with the buttons the zoom allows, or hides it for `null`; focus inside a toolbar that hides goes to `container`. */
export const placeToolbar = (entry: ToolbarEntry, rect: RectPx | null, zoom: number, container: HTMLElement): void => {
  const { root } = entry.elements;

  if (rect === null) releaseFocusOf(root, container);

  setHidden(root, rect === null);

  if (rect === null) return;

  writeStyle(root, 'transform', translateOf(rect.x1, rect.y1));
  placeButtons(entry, zoom);
};
