import { graphIcon } from './graph-icon.ts';
import { iconButton } from './icon-button.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { DetailsViewBase, DetailsViewKind } from '../common/details-view.type.ts';
import { CLOSE_DETAILS_LABEL, DEPENDS_ON_TEXT, EXPLAIN_LABEL, HIDDEN_TEXT } from '../common/details.const.ts';
import type { KeyedPart } from '../common/details.type.ts';
import { DETAILS_ID } from '../common/graph.const.ts';
import { keyedPartsOf } from '../utils/keyed-text.util.ts';

const closeButton = (isOverlay: boolean): HTMLButtonElement => {
  const button = iconButton('close', CLOSE_DETAILS_LABEL, CLOSE_DETAILS_LABEL);

  button.classList.add('details-close');
  button.hidden = !isOverlay;
  button.setAttribute('aria-controls', DETAILS_ID);

  return button;
};

/** A view's root section and its title row; the close button shows only while the panel overlays the canvas. */
export const viewBase = (kind: DetailsViewKind, title: string, isOverlay: boolean): DetailsViewBase => {
  const root = textElement('section', 'details-view', '');
  const row = textElement('div', 'details-title', '');
  const heading = textElement('h2', 'details-heading', title);
  const close = closeButton(isOverlay);

  root.dataset['view'] = kind;
  heading.tabIndex = -1;
  row.append(heading, close);
  root.append(row);

  const base: DetailsViewBase = { root, heading, close };

  return base;
};

/** A section below the title row, ruled off from the one above. */
export const sectionOf = (): HTMLElement => textElement('section', 'details-section', '');

export const lineOf = (text: string): HTMLElement => textElement('p', 'details-line', text);

export const leadOf = (text: string): HTMLElement => textElement('p', 'details-lead', text);

/** The " depends on " between two names, padded so the names read as separate words. */
export const dependsOnOf = (): HTMLElement => textElement('span', '', ` ${DEPENDS_ON_TEXT} `);

/** "[source] depends on [target]" as a lead, with its `id` set and described by `heading`. */
export const endsLeadOf = (source: HTMLButtonElement, target: HTMLButtonElement, id: string, heading: HTMLElement): HTMLElement => {
  const lead = leadOf('');

  lead.id = id;
  heading.setAttribute('aria-describedby', id);
  lead.append(source, dependsOnOf(), target);

  return lead;
};

export const actionButton = (label: string): HTMLButtonElement => {
  const button = textElement('button', 'text-button', label);

  button.type = 'button';
  button.title = label;

  return button;
};

/** A package name as a link-style button; `data-name` lets one delegated listener serve a whole list. */
export const nameButton = (name: string): HTMLButtonElement => {
  const button = textElement('button', 'details-name', name);

  button.type = 'button';
  button.title = name;
  button.dataset['name'] = name;

  return button;
};

/** A row's Explain button; `label` is its accessible name. */
export const explainButton = (label: string): HTMLButtonElement => {
  const button = textElement('button', 'details-explain', EXPLAIN_LABEL);

  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);

  return button;
};

/** The "hidden" mark of a package the filters hide. */
export const markOf = (): HTMLElement => {
  const mark = textElement('span', 'details-mark', HIDDEN_TEXT);
  const icon = graphIcon('eye-closed');

  mark.prepend(icon);

  return mark;
};

const partElement = (part: KeyedPart): HTMLElement => {
  if (part.isKey) return textElement('kbd', '', part.text);

  return textElement('span', '', part.text);
};

/** A paragraph of copy whose backtick-marked key names are drawn as `kbd`. */
export const keyedLine = (text: string, className: string): HTMLElement => {
  const line = textElement('p', className, '');
  const parts = keyedPartsOf(text);
  const elements = parts.map(partElement);

  line.append(...elements);

  return line;
};
