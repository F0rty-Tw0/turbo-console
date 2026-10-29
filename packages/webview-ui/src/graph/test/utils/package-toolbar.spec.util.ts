import type { PackageToolbarElements } from '../../common/widget.type.ts';

/** The toolbar's buttons in DOM order; the Collapse slot is `null` on a flat page. */
export const toolbarButtonsOf = (elements: PackageToolbarElements): (HTMLButtonElement | null)[] => {
  const { focus, startTrace, showTasks, collapse, ellipsis } = elements;
  const buttons = [focus, startTrace, showTasks, collapse, ellipsis];

  return buttons;
};

/** A button that exists and is not hidden. */
export const isShownButton = (button: HTMLButtonElement | null): button is HTMLButtonElement => {
  if (button === null) return false;

  return !button.hidden;
};
