import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';
import type { MenuElements, MenuItem, MenuItemModel } from '../common/widget-menu.type.ts';

/** The leading column every item keeps, so labels line up: the item's icon, or nothing. */
const iconColumnOf = (id: GraphIconId | null): HTMLElement => {
  const column = textElement('span', 'widget-menu-icon', '');

  if (id !== null) column.append(graphIcon(id));

  return column;
};

/** One item, reached by the arrow keys only (`tabindex=-1`); a disabled one stays focusable. */
const itemElementOf = (item: MenuItem): HTMLElement => {
  const button = textElement('button', 'widget-menu-item', '');
  const label = textElement('span', 'widget-menu-label', item.label);
  const icon = iconColumnOf(item.icon);

  button.type = 'button';
  button.tabIndex = -1;
  button.title = item.title ?? item.label;
  button.setAttribute('role', 'menuitem');

  if (item.isDisabled) button.setAttribute('aria-disabled', 'true');

  button.append(icon, label);

  return button;
};

const separatorOf = (): HTMLElement => {
  const separator = document.createElement('hr');

  separator.setAttribute('role', 'separator');

  return separator;
};

const elementOf = (entry: MenuItemModel): HTMLElement => {
  if (entry.kind === 'separator') return separatorOf();

  return itemElementOf(entry);
};

/** A `role="menu"` named `label`, of the model's items and separators; `items` holds the item elements in model order. */
export const buildMenu = (model: MenuItemModel[], label: string): MenuElements => {
  const menu = textElement('div', 'widget-menu', '');
  const items: HTMLElement[] = [];

  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', label);
  menu.tabIndex = -1;

  for (const entry of model) {
    const element = elementOf(entry);

    if (entry.kind === 'item') items.push(element);

    menu.append(element);
  }

  const elements: MenuElements = { menu, items };

  return elements;
};
