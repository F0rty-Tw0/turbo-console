import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { ControlsElements, ControlsGroup, ControlsRow } from '../common/controls-elements.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import { DEFAULT_DEPTH, DEPTH_LABEL, MAX_DEPTH, MIN_DEPTH, SEARCH_LABEL, SHOW_ALL_LABEL, TAGS_LABEL } from '../common/graph.const.ts';
import { countTextOf, focusLabelOf, folderTitleOf, groupLabelOf, showLabelOf } from '../utils/controls-text.util.ts';

const checkbox = (className: string): HTMLInputElement => {
  const check = document.createElement('input');

  check.type = 'checkbox';
  check.className = className;

  return check;
};

/** A checked list checkbox, out of the Tab order: the list is one Tab stop with a roving focus. */
const listCheck = (label: string): HTMLInputElement => {
  const check = checkbox('controls-check');

  check.checked = true;
  check.tabIndex = -1;
  check.setAttribute('aria-label', label);

  return check;
};

const listButton = (className: string, text: string): HTMLButtonElement => {
  const button = textElement('button', className, text);

  button.type = 'button';
  button.tabIndex = -1;

  return button;
};

const gridCell = (...children: HTMLElement[]): HTMLElement => {
  const cell = textElement('div', 'controls-cell', '');

  cell.setAttribute('role', 'gridcell');
  cell.append(...children);

  return cell;
};

const gridLine = (className: string, cells: HTMLElement[]): HTMLElement => {
  const line = textElement('div', className, '');

  line.setAttribute('role', 'row');
  line.append(...cells);

  return line;
};

/** Check, name and focus cells; the name button's `title` keeps the full name when CSS cuts it. */
const packageRow = (pkg: GraphPackage): ControlsRow => {
  const { name } = pkg;
  const check = listCheck(showLabelOf(name));
  const pick = listButton('controls-name', name);
  const focus = listButton('controls-focus', 'Focus');
  const cells = [gridCell(check), gridCell(pick), gridCell(focus)];
  const line = gridLine('controls-row', cells);

  pick.title = name;
  focus.setAttribute('aria-label', focusLabelOf(name));

  const row: ControlsRow = { name, line, check, pick, focus };

  return row;
};

/**
 * One header cell: the group checkbox and the folder title with its total package count. The title repeats the
 * checkbox's name, so it is hidden from the accessibility tree and the row is named once.
 */
const folderGroup = (group: FolderGroup): ControlsGroup => {
  const { folder, packages } = group;
  const title = folderTitleOf(folder);
  const label = groupLabelOf(title, packages.length);
  const check = listCheck(label);
  const text = textElement('span', 'controls-folder', label);
  const cell = gridCell(check, text);
  const line = gridLine('controls-header', [cell]);
  const rows = packages.map(packageRow);
  const controlsGroup: ControlsGroup = { folder, line, check, rows };

  text.setAttribute('aria-hidden', 'true');

  return controlsGroup;
};

/** A caption above its input; the wrapping `<label>` names the input. */
const field = (text: string, input: HTMLInputElement): HTMLElement => {
  const label = textElement('label', 'controls-field', '');
  const caption = textElement('span', 'controls-caption', text);

  label.append(caption, input);

  return label;
};

const searchInput = (): HTMLInputElement => {
  const search = document.createElement('input');

  search.type = 'search';
  search.className = 'controls-input';
  search.autocomplete = 'off';
  search.spellcheck = false;

  return search;
};

const depthInput = (): HTMLInputElement => {
  const depth = document.createElement('input');

  depth.type = 'number';
  depth.className = 'controls-input';
  depth.min = String(MIN_DEPTH);
  depth.max = String(MAX_DEPTH);
  depth.step = '1';
  depth.defaultValue = String(DEFAULT_DEPTH);

  return depth;
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
 * The controls panel `aside#graph-controls`, unwired: search, depth, the tag fieldset (only when tags exist), Show all,
 * the count line and the package grid, in that DOM order. Groups and rows keep the order given.
 */
export const buildControls = (groups: FolderGroup[], tags: string[]): ControlsElements => {
  const search = searchInput();
  const depth = depthInput();
  const tagEntries = tags.map(tagEntry);
  const tagBoxes = new Map(tagEntries);
  const showAll = showAllButton();
  const total = groups.reduce(addSize, 0);
  const count = countLine(total);
  const controlsGroups = groups.map(folderGroup);
  const list = packageGrid(controlsGroups);
  const panel = textElement('aside', 'graph-controls', '');

  panel.id = 'graph-controls';
  panel.append(field(SEARCH_LABEL, search), field(DEPTH_LABEL, depth));

  if (tagBoxes.size > 0) panel.append(tagFieldset(tagBoxes));

  panel.append(showAll, count, list);

  const controls: ControlsElements = { panel, search, depth, tags: tagBoxes, showAll, count, list, groups: controlsGroups };

  return controls;
};
