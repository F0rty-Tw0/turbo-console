import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';
import type { FolderRowElements, RowKind } from '../common/widget.type.ts';
import { folderActionsLabelOf, packageActionsLabelOf } from '../utils/controls-text.util.ts';
import { pluralOf } from '../utils/plural.util.ts';

/** A 24 px icon button; the aria-label is its accessible name. */
const widgetButton = (id: GraphIconId, label: string): HTMLButtonElement => {
  const button = textElement('button', 'widget-button', '');
  const icon = graphIcon(id);

  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.append(icon);

  return button;
};

/** A "…" that opens a menu. */
const menuButton = (label: string): HTMLButtonElement => {
  const button = widgetButton('ellipsis', label);

  button.setAttribute('aria-haspopup', 'menu');

  return button;
};

/** The chevron of an expanded folder collapses it; a collapsed folder's expands it. */
const chevronOf = (kind: RowKind, title: string): HTMLButtonElement => {
  const isExpanded = kind === 'box';
  const icon = isExpanded ? 'chevron-down' : 'chevron-right';
  const verb = isExpanded ? 'Collapse' : 'Expand';
  const chevron = widgetButton(icon, `${verb} ${title}`);

  chevron.setAttribute('aria-expanded', String(isExpanded));

  return chevron;
};

/** A package count as a pill: the number is drawn, screen readers and the tooltip get "12 packages". */
const countBadge = (count: number): HTMLElement => {
  const label = pluralOf(count, 'package', 'packages');
  const badge = textElement('span', 'widget-count', '');
  const number = textElement('span', '', String(count));
  const spoken = textElement('span', 'visually-hidden', label);

  number.setAttribute('aria-hidden', 'true');
  badge.setAttribute('title', label);
  badge.append(number, spoken);

  return badge;
};

/** A box's folder glyph, its title cut on screen with "…" while its `title` attribute keeps it whole, and its package count badge. */
const titleParts = (kind: RowKind, title: string, count: number): HTMLElement[] => {
  if (kind === 'collapsed') return [];

  const glyph = graphIcon('folder-opened');
  const text = textElement('span', 'widget-title', title);
  const badge = countBadge(count);

  glyph.classList.add('widget-glyph');
  text.setAttribute('title', title);

  return [glyph, text, badge];
};

/**
 * A folder's header row: the chevron, then for a box its folder glyph, title and package count badge, then the "…". A collapsed node
 * shows its title and count in its canvas label, so its row holds the two buttons only.
 */
export const buildFolderRow = (kind: RowKind, title: string, count: number): FolderRowElements => {
  const root = textElement('div', `widget-row widget-row-${kind}`, '');
  const chevron = chevronOf(kind, title);
  const ellipsis = menuButton(folderActionsLabelOf(title));
  const middle = titleParts(kind, title, count);
  const row: FolderRowElements = { root, chevron, ellipsis };

  root.hidden = true;
  root.append(chevron, ...middle, ellipsis);

  return row;
};

/** The selected package's "…", hidden until the layer places it. */
export const buildPackageButton = (name: string): HTMLButtonElement => {
  const button = menuButton(packageActionsLabelOf(name));

  button.classList.add('widget-package-button');
  button.hidden = true;

  return button;
};
