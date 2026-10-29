import type { TaskToolbarElements } from '../../common/task-toolbar.type.ts';
import type { PackageToolbarElements } from '../../common/widget.type.ts';

/** The package toolbar's buttons in DOM order; the Collapse slot is `null` on a flat page. */
export const packageButtonsOf = (elements: PackageToolbarElements): (HTMLButtonElement | null)[] => {
  const { focus, startTrace, showTasks, collapse, ellipsis } = elements;
  const buttons = [focus, startTrace, showTasks, collapse, ellipsis];

  return buttons;
};

/** The task toolbar's buttons in DOM order; Show package is `null` for a root task. */
export const taskButtonsOf = (elements: TaskToolbarElements): (HTMLButtonElement | null)[] => {
  const { run, showPackage, ellipsis } = elements;
  const buttons = [run, showPackage, ellipsis];

  return buttons;
};

/** A button that exists and is not hidden. */
export const isShownButton = (button: HTMLButtonElement | null): button is HTMLButtonElement => {
  if (button === null) return false;

  return !button.hidden;
};
