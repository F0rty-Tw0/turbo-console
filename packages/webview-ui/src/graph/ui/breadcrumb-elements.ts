import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import { ALL_FOLDERS_LABEL, BREADCRUMB_LABEL } from '../common/graph.const.ts';
import type { BreadcrumbElements } from '../common/widget-menu.type.ts';

/** The folder focus `nav`, hidden until a folder is focused: "All folders", the focused title, then its muted lines. */
export const buildBreadcrumb = (): BreadcrumbElements => {
  const nav = textElement('nav', 'graph-breadcrumb', '');
  const allFolders = textElement('button', 'text-button breadcrumb-back', '');
  const backText = textElement('span', '', ALL_FOLDERS_LABEL);
  const title = textElement('span', 'breadcrumb-title', '');
  const lines = textElement('ul', 'breadcrumb-lines', '');
  const elements: BreadcrumbElements = { nav, allFolders, title, lines };

  nav.hidden = true;
  nav.setAttribute('aria-label', BREADCRUMB_LABEL);
  allFolders.type = 'button';
  allFolders.append(graphIcon('chevron-left'), backText);
  title.setAttribute('aria-current', 'page');
  nav.append(allFolders, title, lines);

  return elements;
};

/** One muted line; the closing "and <k> more" line has no icon. */
export const breadcrumbLine = (text: string, hasIcon: boolean): HTMLElement => {
  const line = textElement('li', 'breadcrumb-line', '');
  const label = textElement('span', '', text);

  if (hasIcon) line.append(graphIcon('info'));

  line.append(label);

  return line;
};
