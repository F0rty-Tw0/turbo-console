import { kindIn, stopOf } from './roving-stop.util.ts';
import type { PackageMenuState, PackageToolbarElements, PackageToolbarKind, PackageToolbarShown } from '../common/widget.type.ts';

/** The buttons the package toolbar shows besides the "…", which always shows: none while compact. */
export const packageToolbarShownOf = (state: PackageMenuState, hasFolder: boolean, isCompact: boolean): PackageToolbarShown => {
  const shown: PackageToolbarShown = {
    focus: !isCompact,
    startTrace: !isCompact,
    showTasks: !isCompact && state.hasTasks,
    collapse: !isCompact && hasFolder
  };

  return shown;
};

/** The full toolbar's buttons, the "…" included. */
export const packageToolbarCountOf = (state: PackageMenuState, hasFolder: boolean): number => {
  const shown = packageToolbarShownOf(state, hasFolder, false);
  const buttons = Object.values(shown).filter(Boolean);

  return buttons.length + 1;
};

/** The toolbar's buttons in DOM order. */
export const TOOLBAR_ORDER: PackageToolbarKind[] = ['focus', 'startTrace', 'showTasks', 'collapse', 'ellipsis'];

/** The buttons a pass shows, in DOM order; the "…" shows on every pass. */
export const toolbarShownKindsOf = (shown: PackageToolbarShown): PackageToolbarKind[] => {
  const isShown: Record<PackageToolbarKind, boolean> = { ...shown, ellipsis: true };

  return TOOLBAR_ORDER.filter((kind) => isShown[kind]);
};

/** The toolbar's Tab stop: `preferred` while shown, else the first shown button; the "…" when none is. */
export const toolbarStopOf = (preferred: PackageToolbarKind, shown: PackageToolbarKind[]): PackageToolbarKind =>
  stopOf(preferred, shown, 'ellipsis');

/** The button of `elements` that `target` is, `undefined` when it is none of them; a `null` target is none, though a flat page's Collapse is `null` too. */
export const toolbarKindOf = (elements: PackageToolbarElements, target: EventTarget | null): PackageToolbarKind | undefined =>
  kindIn(TOOLBAR_ORDER, elements, target);
