import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';
import type { FolderRowElements, RowKind } from '../common/widget.type.ts';
import { folderActionsLabelOf, packageActionsLabelOf } from '../utils/controls-text.util.ts';
import { pluralOf } from '../utils/plural.util.ts';

/** A 24 px icon button; the aria-label is its accessible name and its hover title. */
const widgetButton = (id: GraphIconId, label: string): HTMLButtonElement => {
  const button = textElement('button', 'widget-button', '');
  const icon = graphIcon(id);

  button.type = 'button';
  button.title = label;
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

/** A row's folder glyph. */
const glyphOf = (): HTMLElement => {
  const glyph = graphIcon('folder-opened');

  glyph.classList.add('widget-glyph');

  return glyph;
};

/** A row's title button: cut on screen with "…", while its `title` shows the whole name on hover. */
const titleButtonOf = (title: string): HTMLButtonElement => {
  const button = textElement('button', 'widget-title', title);

  button.type = 'button';
  button.setAttribute('title', title);

  return button;
};

/** A folder's header row, on a box or a collapsed node: the chevron, the folder glyph, title and package count badge, then the "…". */
export const buildFolderRow = (kind: RowKind, title: string, count: number): FolderRowElements => {
  const root = textElement('div', `widget-row widget-row-${kind}`, '');
  const chevron = chevronOf(kind, title);
  const ellipsis = menuButton(folderActionsLabelOf(title));
  const glyph = glyphOf();
  const titleButton = titleButtonOf(title);
  const badge = countBadge(count);
  const row: FolderRowElements = { root, chevron, title: titleButton, ellipsis };

  root.hidden = true;
  root.append(chevron, glyph, titleButton, badge, ellipsis);

  return row;
};

/** The selected package's "…", hidden until the layer places it. */
export const buildPackageButton = (name: string): HTMLButtonElement => {
  const button = menuButton(packageActionsLabelOf(name));

  button.classList.add('widget-package-button');
  button.hidden = true;

  return button;
};
