import { writeStops } from './roving-stop.ts';
import { setHidden, translateOf, writeStyle } from './widget-row-place.ts';
import type { PackageToolbarElements, PackageToolbarKind, RectPx, ToolbarEntry } from '../common/widget.type.ts';
import {
  TOOLBAR_ORDER,
  packageToolbarShownOf,
  toolbarKindOf,
  toolbarShownKindsOf,
  toolbarStopOf
} from '../utils/package-toolbar.util.ts';
import { isNodeToolbarCompact } from '../utils/widget-geometry.util.ts';

/** Whether `active` is a toolbar button the pass hides. */
const isHiddenActive = (elements: PackageToolbarElements, shown: PackageToolbarKind[], active: Element | null): boolean => {
  const kind = toolbarKindOf(elements, active);

  return kind !== undefined && !shown.includes(kind);
};

/** Shows the buttons the zoom and the state allow with `preferred` (else the first shown) as the Tab stop; focus left on a hidden one goes to the "…". */
const placeButtons = (entry: ToolbarEntry, zoom: number): void => {
  const { state, folder, elements, preferred } = entry;
  const flags = packageToolbarShownOf(state, folder !== null, isNodeToolbarCompact(zoom));
  const shown = toolbarShownKindsOf(flags);
  const active = elements.root.ownerDocument.activeElement;
  const isLostFocus = isHiddenActive(elements, shown, active);

  for (const kind of TOOLBAR_ORDER) {
    const button = elements[kind];

    if (button !== null) setHidden(button, !shown.includes(kind));
  }

  entry.shown = shown;
  writeStops(TOOLBAR_ORDER, elements, toolbarStopOf(preferred, shown));

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
