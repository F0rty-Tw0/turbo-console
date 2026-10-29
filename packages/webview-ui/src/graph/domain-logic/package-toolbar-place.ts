import { setHidden, translateOf, writeStyle } from './widget-row-place.ts';
import type { PackageToolbarElements, PackageToolbarKind, RectPx, ToolbarEntry } from '../common/widget.type.ts';
import { toolbarIndexOf } from '../utils/menu-keys.util.ts';
import {
  TOOLBAR_ORDER,
  packageToolbarShownOf,
  toolbarKindOf,
  toolbarShownKindsOf,
  toolbarStopOf
} from '../utils/package-toolbar.util.ts';
import { isNodeToolbarCompact } from '../utils/widget-geometry.util.ts';

/** Tab stop 0 on the one stop, -1 on the rest, a write skipped when unchanged. */
const writeTabStop = (button: HTMLButtonElement, isStop: boolean): void => {
  const tabIndex = isStop ? 0 : -1;

  if (button.tabIndex !== tabIndex) button.tabIndex = tabIndex;
};

/** The Tab stop on the `stop` button and off the rest. */
const writeStops = (elements: PackageToolbarElements, stop: PackageToolbarKind): void => {
  for (const kind of TOOLBAR_ORDER) {
    const button = elements[kind];

    if (button !== null) writeTabStop(button, kind === stop);
  }
};

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
  writeStops(elements, toolbarStopOf(preferred, shown));

  if (isLostFocus) elements.ellipsis.focus();
};

/** Left/Right/Home/End move focus and the Tab stop across the shown buttons; other keys pass through (Shift+F10 reaches the layer). */
export const moveInToolbar = (entry: ToolbarEntry, event: KeyboardEvent): void => {
  const { elements, shown } = entry;
  const kind = toolbarKindOf(elements, event.target);
  const index = shown.findIndex((shownKind) => shownKind === kind);
  const next = toolbarIndexOf(event.key, index, shown.length);

  if (next === null) return;

  const nextKind = shown[next];
  const button = nextKind === undefined ? null : elements[nextKind];

  if (nextKind === undefined || button === null) return;

  event.preventDefault();
  entry.preferred = nextKind;
  writeStops(elements, nextKind);
  button.focus();
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
