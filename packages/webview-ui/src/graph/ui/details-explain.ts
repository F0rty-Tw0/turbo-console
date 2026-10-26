import { actionButton, lineOf } from './details-parts.ts';
import { graphIcon } from './graph-icon.ts';
import type { ManifestEntry } from '../../bridge/common/graph-message.type.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { ExcerptRowElements, ExplainDetails, ExplainEntry } from '../common/details-view.type.ts';
import { NO_ENTRY_TEXT, OPEN_MANIFEST_LABEL, UNREADABLE_TEXT } from '../common/details.const.ts';
import type {
  ExcerptRow,
  ExplainState,
  FoundExplain,
  MissingExplain,
  ReadingExplain,
  UnreadableExplain
} from '../common/details.type.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';
import { setButtonLabel } from '../utils/button-title.util.ts';
import {
  entryLabelOf,
  missingTextOf,
  openAtLabelOf,
  openManifestLabelOf,
  readingTextOf,
  unreadableTextOf
} from '../utils/details-text.util.ts';
import { excerptRowsOf } from '../utils/excerpt.util.ts';

type StatusIcon = Extract<GraphIconId, 'info' | 'warning'>;

/** A status is a coloured icon and a word, never a coloured border (D18). */
const statusOf = (id: StatusIcon, word: string): HTMLElement => {
  const status = textElement('p', 'details-status', '');
  const icon = graphIcon(id);
  const strong = textElement('strong', 'details-status-word', word);

  icon.classList.add(`icon-${id}`);
  status.append(icon, strong);

  return status;
};

const excerptRow = (excerpt: HTMLElement, row: ExcerptRow): ExcerptRowElements => {
  const line = textElement('div', 'excerpt-row', '');
  const numberText = String(row.number);
  const number = textElement('span', 'excerpt-number', numberText);
  const text = textElement('span', 'excerpt-text', row.text);

  if (row.isEntry) line.classList.add('is-entry');

  line.append(number, text);
  excerpt.append(line);

  const elements: ExcerptRowElements = { row: line, number, text };

  return elements;
};

const entryOf = (list: HTMLElement, entry: ManifestEntry): ExplainEntry => {
  const li = textElement('li', 'details-entry', '');
  const labelText = entryLabelOf(entry);
  const label = textElement('p', 'details-muted', labelText);
  const excerpt = textElement('div', 'excerpt', '');
  const excerptRows = excerptRowsOf(entry);
  const rows = excerptRows.map((row) => excerptRow(excerpt, row));
  const openText = openAtLabelOf(entry.line);
  const open = actionButton(openText);
  const openLabel = openManifestLabelOf(entry);

  setButtonLabel(open, openLabel);
  li.append(label, excerpt, open);
  list.append(li);

  const parts: ExplainEntry = { label, rows, open };

  return parts;
};

const fileHeading = (file: HTMLElement): HTMLElement => {
  const heading = textElement('h3', 'details-file', '');
  const icon = graphIcon('file');

  heading.append(icon, file);

  return heading;
};

const explainOf = (): ExplainDetails => {
  const root = textElement('div', 'details-explain-body', '');
  const base: ExplainDetails = { root, file: null, text: null, entries: [], open: null };

  return base;
};

const readingOf = (state: ReadingExplain): ExplainDetails => {
  const base = explainOf();
  const readingText = readingTextOf(state.file);
  const text = lineOf(readingText);

  base.root.append(text);

  const view: ExplainDetails = { ...base, text };

  return view;
};

const foundOf = (state: FoundExplain): ExplainDetails => {
  const base = explainOf();
  const file = textElement('span', 'details-code', state.file);
  const heading = fileHeading(file);
  const list = textElement('ul', 'details-entries', '');
  const entries = state.entries.map((entry) => entryOf(list, entry));

  base.root.append(heading, list);

  const view: ExplainDetails = { ...base, file, entries };

  return view;
};

const missingOf = (state: MissingExplain): ExplainDetails => {
  const base = explainOf();
  const heading = statusOf('info', NO_ENTRY_TEXT);
  const missingText = missingTextOf(state.file, state.target);
  const text = lineOf(missingText);
  const open = actionButton(OPEN_MANIFEST_LABEL);

  base.root.append(heading, text, open);

  const view: ExplainDetails = { ...base, text, open };

  return view;
};

const unreadableOf = (state: UnreadableExplain): ExplainDetails => {
  const base = explainOf();
  const heading = statusOf('warning', UNREADABLE_TEXT);
  const unreadableText = unreadableTextOf(state.file);
  const text = lineOf(unreadableText);

  base.root.append(heading, text);

  const view: ExplainDetails = { ...base, text };

  return view;
};

/** The explain block for one state of the manifest lookup; the link view's live slot holds it. */
export const explainView = (state: ExplainState): ExplainDetails => {
  switch (state.kind) {
    case 'reading':
      return readingOf(state);
    case 'found':
      return foundOf(state);
    case 'missing':
      return missingOf(state);
    case 'unreadable':
      return unreadableOf(state);
  }
};
