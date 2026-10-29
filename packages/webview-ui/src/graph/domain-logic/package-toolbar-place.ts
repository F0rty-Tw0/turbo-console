import { placeToolbarRoot, writeShown } from './node-toolbar-place.ts';
import type { RectPx, ToolbarEntry } from '../common/widget.type.ts';
import { TOOLBAR_ORDER, packageToolbarShownOf, toolbarShownKindsOf, toolbarStopOf } from '../utils/package-toolbar.util.ts';
import { isNodeToolbarCompact } from '../utils/widget-geometry.util.ts';

/** Shows the buttons the zoom and the state allow with `preferred` (else the first shown) as the Tab stop; focus left on a hidden one goes to the "…". */
const placeButtons = (entry: ToolbarEntry, zoom: number): void => {
  const { state, folder, elements, preferred } = entry;
  const isCompact = isNodeToolbarCompact(zoom);
  const flags = packageToolbarShownOf(state, folder !== null, isCompact);
  const shown = toolbarShownKindsOf(flags);
  const stop = toolbarStopOf(preferred, shown);
  const isLostFocus = writeShown(entry, TOOLBAR_ORDER, shown, stop);

  if (isLostFocus) elements.ellipsis.focus();
};

/** Shows the toolbar at `rect` on whole px with the buttons the zoom allows, or hides it for `null`; focus inside a toolbar that hides goes to `container`. */
export const placeToolbar = (entry: ToolbarEntry, rect: RectPx | null, zoom: number, container: HTMLElement): void => {
  placeToolbarRoot(entry.elements.root, rect, container);

  if (rect === null) return;

  placeButtons(entry, zoom);
};
