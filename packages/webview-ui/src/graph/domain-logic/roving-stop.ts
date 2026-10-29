import type { RovingButtons, RovingEntry } from '../common/widget.type.ts';
import { toolbarIndexOf } from '../utils/menu-keys.util.ts';
import { kindIn } from '../utils/roving-stop.util.ts';

/** Makes `stop` the one Tab stop: tabIndex 0 on it, -1 on the other buttons of `order`, each write skipped when unchanged. */
export const writeStops = <TKind extends string>(order: TKind[], buttons: RovingButtons<TKind>, stop: TKind): void => {
  for (const kind of order) {
    const button = buttons[kind];
    const tabIndex = kind === stop ? 0 : -1;

    if (button !== null && button.tabIndex !== tabIndex) button.tabIndex = tabIndex;
  }
};

/** Left/Right/Home/End move focus and the Tab stop across the shown buttons; other keys pass through (Shift+F10 reaches the layer). */
export const moveStopOnKey = <TKind extends string>(entry: RovingEntry<TKind>, order: TKind[], event: KeyboardEvent): void => {
  const { elements, shown } = entry;
  const kind = kindIn(order, elements, event.target);
  const index = shown.findIndex((shownKind) => shownKind === kind);
  const next = toolbarIndexOf(event.key, index, shown.length);

  if (next === null) return;

  const nextKind = shown[next];

  if (nextKind === undefined) return;

  const button = elements[nextKind];

  if (button === null) return;

  event.preventDefault();
  entry.preferred = nextKind;
  writeStops(order, elements, nextKind);
  button.focus();
};

/** Focus landing on a button (a click, a menu handing it back, the "…" catching it from a hidden button) makes it the preferred Tab stop, so Shift+Tab leaves the widget. */
export const followFocus = <TKind extends string>(entry: RovingEntry<TKind>, order: TKind[], event: FocusEvent): void => {
  const kind = kindIn(order, entry.elements, event.target);

  if (kind === undefined) return;

  entry.preferred = kind;
  writeStops(order, entry.elements, kind);
};
