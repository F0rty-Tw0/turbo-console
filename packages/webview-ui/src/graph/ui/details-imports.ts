import { statusOf } from './details-explain.ts';
import { actionButton, lineOf } from './details-parts.ts';
import { graphIcon } from './graph-icon.ts';
import { iconButton } from './icon-button.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import { SCAN_AGAIN_TITLE } from '../common/details-imports.const.ts';
import type { ImportGroupModel, ImportRowModel, ImportsViewModel } from '../common/details-imports.type.ts';
import type { ImportRowElements, ImportsDetails } from '../common/details-view.type.ts';

const tagsOf = (row: ImportRowModel): HTMLElement => {
  const tags = textElement('span', 'import-tags', '');
  const tagElements = row.tags.map((tag) => textElement('span', 'import-tag', tag));

  tags.append(...tagElements);

  return tags;
};

const rowButtonOf = (row: ImportRowModel): HTMLButtonElement => {
  const button = textElement('button', 'import-row', '');
  const number = textElement('span', 'excerpt-number', row.number);
  const text = textElement('span', 'import-text', row.text);
  const hasTags = row.tags.length > 0;

  button.type = 'button';
  button.title = row.label;
  button.setAttribute('aria-label', row.label);
  button.append(number, text);

  if (hasTags) button.append(tagsOf(row));

  return button;
};

const rowOf = (row: ImportRowModel): ImportRowElements => {
  const button = rowButtonOf(row);
  const elements: ImportRowElements = { site: row, button };

  return elements;
};

const fileHeadingOf = (group: ImportGroupModel): HTMLElement => {
  const heading = textElement('h4', 'details-file', '');
  const icon = graphIcon('file-code');
  const file = textElement('span', 'details-code', group.file);

  heading.append(icon, file);

  return heading;
};

const scanAgainOf = (model: ImportsViewModel): HTMLButtonElement => {
  const scanAgain = iconButton('refresh', model.scanLabel, SCAN_AGAIN_TITLE);

  if (model.isScanning) scanAgain.setAttribute('aria-disabled', 'true');

  return scanAgain;
};

const headerOf = (model: ImportsViewModel, scanAgain: HTMLButtonElement): HTMLElement => {
  const header = textElement('div', 'details-imports-header', '');
  const heading = textElement('h3', '', model.heading);

  header.append(heading, scanAgain);

  return header;
};

const appendGroup = (root: HTMLElement, group: ImportGroupModel): ImportRowElements[] => {
  const rows = group.rows.map(rowOf);
  const buttons = rows.map((row) => row.button);

  root.append(fileHeadingOf(group), ...buttons);

  return rows;
};

const moreOf = (text: string | null): HTMLButtonElement | null => {
  if (text === null) return null;

  return actionButton(text);
};

/** The imports block of one `ImportsViewModel`: header with Scan again, status, lines, rows by file, Show more, notes. */
export const importsView = (model: ImportsViewModel): ImportsDetails => {
  const root = textElement('div', 'details-imports-block', '');
  const scanAgain = scanAgainOf(model);
  const header = headerOf(model, scanAgain);
  const lines = model.lines.map(lineOf);
  const notes = model.notes.map((note) => textElement('p', 'details-muted', note));
  const more = moreOf(model.more);

  root.append(header);

  if (model.status !== null) root.append(statusOf(model.status.icon, model.status.word));

  root.append(...lines);

  const groupRows = model.groups.map((group) => appendGroup(root, group));
  const rows = groupRows.flat();

  if (more !== null) root.append(more);

  root.append(...notes);

  const view: ImportsDetails = { root, scanAgain, rows, more };

  return view;
};
