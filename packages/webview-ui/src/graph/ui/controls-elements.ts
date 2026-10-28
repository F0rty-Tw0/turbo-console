import { checkbox, depthInput, field, groupingField, hintedField, searchInput } from './controls-fields.ts';
import { gridCell, gridLine, listButton, listCheck } from './controls-list-parts.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { ControlsElements, ControlsGroup, ControlsRow } from '../common/controls-elements.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import {
  CONTROLS_ID,
  DEPTH_HINT,
  DEPTH_HINT_ID,
  DEPTH_LABEL,
  SEARCH_LABEL,
  SHOW_ALL_LABEL,
  TAGS_LABEL
} from '../common/graph.const.ts';
import {
  countTextOf,
  focusLabelOf,
  folderFocusLabelOf,
  folderFocusTextOf,
  folderTitleOf,
  folderToggleTextOf,
  groupLabelOf,
  showLabelOf
} from '../utils/controls-text.util.ts';

/** Check, name and focus cells; the name button's `title` keeps the full name when CSS cuts it. */
const packageRow = (pkg: GraphPackage): ControlsRow => {
  const { name } = pkg;
  const check = listCheck(showLabelOf(name));
  const pick = listButton('controls-name', name);
  const focus = listButton('controls-focus', folderFocusTextOf(false));
  const focusLabel = focusLabelOf(name);
  const cells = [gridCell(check), gridCell(pick), gridCell(focus)];
  const line = gridLine('controls-row', cells);

  focus.title = focusLabel;
  focus.setAttribute('aria-label', focusLabel);

  const row: ControlsRow = { name, line, check, pick, focus };

  return row;
};

/**
 * One header: a cell with the group checkbox and the folder title with its total package count, then a cell with the
 * Expand or Collapse button and one with the Focus button. The title repeats the checkbox's name, so it is hidden from
 * the accessibility tree and the row is named once. `renderControls` sets the buttons' text, labels and `hidden`.
 */
const folderGroup = (group: FolderGroup): ControlsGroup => {
  const { folder, packages } = group;
  const title = folderTitleOf(folder);
  const label = groupLabelOf(title, packages.length);
  const check = listCheck(label);
  const text = textElement('span', 'controls-folder', label);
  const toggle = listButton('controls-toggle', folderToggleTextOf(false));
  const focus = listButton('controls-focus', 'Focus');
  const focusLabel = folderFocusLabelOf(title);
  const cells = [gridCell(check, text), gridCell(toggle), gridCell(focus)];
  const line = gridLine('controls-header', cells);
  const rows = packages.map(packageRow);
  const controlsGroup: ControlsGroup = { folder, line, check, toggle, focus, rows };

  toggle.hidden = true;
  focus.hidden = true;
  focus.title = focusLabel;
  focus.setAttribute('aria-label', focusLabel);

  text.setAttribute('aria-hidden', 'true');

  return controlsGroup;
};

const tagEntry = (tag: string): [string, HTMLInputElement] => [tag, checkbox('controls-check')];

const tagFieldset = (tags: Map<string, HTMLInputElement>): HTMLElement => {
  const fieldset = textElement('fieldset', 'controls-tags', '');
  const legend = textElement('legend', 'controls-legend', TAGS_LABEL);

  fieldset.append(legend);

  for (const [tag, box] of tags) {
    const label = textElement('label', 'controls-tag', tag);

    label.prepend(box);
    fieldset.append(label);
  }

  return fieldset;
};

/** Nothing is filtered yet, so Show all starts dimmed; `aria-disabled` keeps it a Tab stop. */
const showAllButton = (): HTMLButtonElement => {
  const button = textElement('button', 'text-button', SHOW_ALL_LABEL);

  button.type = 'button';
  button.title = SHOW_ALL_LABEL;
  button.setAttribute('aria-disabled', 'true');

  return button;
};

const countLine = (total: number): HTMLElement => {
  const count = textElement('p', 'controls-count', countTextOf(total, total));

  count.setAttribute('role', 'status');
  count.setAttribute('aria-live', 'polite');

  return count;
};

const addSize = (sum: number, group: FolderGroup): number => sum + group.packages.length;

/** Each group's header line, then its rows; the first group's checkbox is the list's one Tab stop. */
const packageGrid = (groups: ControlsGroup[]): HTMLElement => {
  const list = textElement('div', 'controls-list', '');
  const first = groups.at(0);

  list.setAttribute('role', 'grid');

  if (first !== undefined) first.check.tabIndex = 0;

  for (const group of groups) {
    const lines = group.rows.map((row) => row.line);

    list.append(group.line, ...lines);
  }

  return list;
};

/**
 * The controls panel `aside#graph-controls`, unwired: search, depth, Group by folder, the tag fieldset (only when tags exist), Show all,
 * the count line and the package grid, in that DOM order. Groups and rows keep the order given.
 */
export const buildControls = (groups: FolderGroup[], tags: string[]): ControlsElements => {
  const search = searchInput();
  const depth = depthInput();
  const depthField = hintedField(DEPTH_LABEL, depth, DEPTH_HINT, DEPTH_HINT_ID);
  const grouping = checkbox('controls-check');
  const tagEntries = tags.map(tagEntry);
  const tagBoxes = new Map(tagEntries);
  const showAll = showAllButton();
  const total = groups.reduce(addSize, 0);
  const count = countLine(total);
  const controlsGroups = groups.map(folderGroup);
  const list = packageGrid(controlsGroups);
  const panel = textElement('aside', 'graph-controls', '');

  panel.id = CONTROLS_ID;
  panel.append(field(SEARCH_LABEL, search), depthField, groupingField(grouping));

  if (tagBoxes.size > 0) panel.append(tagFieldset(tagBoxes));

  panel.append(showAll, count, list);

  const controls: ControlsElements = { panel, search, depth, grouping, tags: tagBoxes, showAll, count, list, groups: controlsGroups };

  return controls;
};
