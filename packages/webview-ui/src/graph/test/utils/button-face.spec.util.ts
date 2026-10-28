import type { PackageDetails } from '../../common/details-view.type.ts';

/** A button drawn like a Details action: its icon with the class `iconClass`, then its label. */
export const iconTextButtonOf = (iconClass: string): HTMLButtonElement => {
  const button = document.createElement('button');
  const icon = document.createElement('span');
  const label = document.createElement('span');

  icon.className = iconClass;
  button.append(icon, label);

  return button;
};

/** The first child's class, which names the icon, and the last child's text, the label. */
export const faceOf = (button: HTMLButtonElement): (string | null | undefined)[] => {
  const children = Array.from(button.children);
  const face = [children[0]?.className, children.at(-1)?.textContent];

  return face;
};

/** A package view's action buttons in document order. */
export const packageButtonsOf = (view: PackageDetails): HTMLButtonElement[] => {
  const buttons = [view.openDetails, view.focus, view.exclude, view.startTrace, view.showTasks];

  return buttons;
};
