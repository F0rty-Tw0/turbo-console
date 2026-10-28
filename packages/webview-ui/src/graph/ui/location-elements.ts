import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import { BREADCRUMB_MAX_LINES } from '../common/graph.const.ts';
import { LOCATION_LABEL } from '../common/location.const.ts';
import type { LocationBarElements, LocationCrumb, LocationPress } from '../common/location.type.ts';

/** The location bar, hidden until the graph view shows: the crumb list, then the folder focus info lines. */
export const buildLocation = (): LocationBarElements => {
  const nav = textElement('nav', 'graph-location', '');
  const crumbs = textElement('ol', 'location-crumbs', '');
  const lines = textElement('ul', 'location-lines', '');
  const elements: LocationBarElements = { nav, crumbs, lines };

  nav.hidden = true;
  nav.setAttribute('aria-label', LOCATION_LABEL);
  nav.append(crumbs, lines);

  return elements;
};

/** The current crumb: text marked as the page, focusable from script only so focus can land on it after a press. */
const currentCrumb = (label: string): HTMLElement => {
  const current = textElement('span', 'location-current', label);

  current.tabIndex = -1;
  current.setAttribute('aria-current', 'page');

  return current;
};

/** A crumb the user can go to, styled as a link. */
const crumbButton = (crumb: LocationCrumb, press: LocationPress): HTMLButtonElement => {
  const button = textElement('button', 'details-name', crumb.label);

  button.type = 'button';
  button.title = crumb.label;
  button.setAttribute('aria-label', crumb.label);
  button.addEventListener('click', (): void => press(crumb));

  return button;
};

/** The current crumb's text, or a button for any other crumb. */
const crumbChild = (crumb: LocationCrumb, press: LocationPress): HTMLElement => {
  if (crumb.isCurrent) return currentCrumb(crumb.label);

  return crumbButton(crumb, press);
};

const listItem = (child: HTMLElement): HTMLElement => {
  const item = textElement('li', '', '');

  item.append(child);

  return item;
};

/** One muted info line; the closing "and <k> more" line has no icon. */
const locationLine = (text: string, index: number): HTMLElement => {
  const line = textElement('li', 'location-line', '');
  const label = textElement('span', '', text);

  if (index < BREADCRUMB_MAX_LINES) line.append(graphIcon('info'));

  line.append(label);

  return line;
};

/** Rebuilds the info lines only, hiding the list when there are none; the crumbs and any focus on them stay. */
export const renderLocationLines = (elements: LocationBarElements, lines: string[]): void => {
  const lineItems = lines.map(locationLine);

  elements.lines.replaceChildren(...lineItems);
  elements.lines.hidden = lines.length === 0;
};

/**
 * Rebuilds the crumbs and the info lines. Focus inside the bar moves to the new current crumb, since the button it was on
 * is gone; focus elsewhere is left alone.
 */
export const renderLocation = (
  elements: LocationBarElements,
  crumbs: LocationCrumb[],
  lines: string[],
  press: LocationPress
): void => {
  const hadFocus = elements.nav.contains(document.activeElement);
  const children = crumbs.map((crumb) => crumbChild(crumb, press));
  const items = children.map(listItem);
  const currentIndex = crumbs.findIndex((crumb) => crumb.isCurrent);
  const current = children[currentIndex];

  elements.crumbs.replaceChildren(...items);
  renderLocationLines(elements, lines);

  if (hadFocus) current?.focus();
};
