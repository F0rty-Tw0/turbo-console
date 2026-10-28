import { checkbox } from './controls-fields.ts';
import { iconButton } from './icon-button.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';

/** A checked list checkbox, out of the Tab order: the list is one Tab stop with a roving focus. */
export const listCheck = (label: string): HTMLInputElement => {
  const check = checkbox('controls-check');

  check.checked = true;
  check.tabIndex = -1;
  check.setAttribute('aria-label', label);

  return check;
};

export const listButton = (className: string, text: string): HTMLButtonElement => {
  const button = textElement('button', className, text);

  button.type = 'button';
  button.title = text;
  button.tabIndex = -1;

  return button;
};

/** An `iconButton` for a grid cell, out of the Tab order like `listButton`; `className` keeps the cell's look and reveal rules. */
export const listIconButton = (
  className: 'controls-focus' | 'controls-toggle',
  icon: GraphIconId,
  label: string,
  title: string
): HTMLButtonElement => {
  const button = iconButton(icon, label, title);

  button.classList.add(className);
  button.tabIndex = -1;

  return button;
};

export const gridCell = (...children: HTMLElement[]): HTMLElement => {
  const cell = textElement('div', 'controls-cell', '');

  cell.setAttribute('role', 'gridcell');
  cell.append(...children);

  return cell;
};

export const gridLine = (className: string, cells: HTMLElement[]): HTMLElement => {
  const line = textElement('div', className, '');

  line.setAttribute('role', 'row');
  line.append(...cells);

  return line;
};
