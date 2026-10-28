import { setButtonIcon, setButtonLabel, setButtonText } from './button-title.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { ControlsElements, ControlsGroup, ControlsRow } from '../common/controls-elements.type.ts';
import { CLEAR_FOCUS_LABEL, FOCUS_FOLDER_LABEL } from '../common/details.const.ts';
import type { ControlsView } from '../common/graph-controls.type.ts';
import type { PageElements } from '../common/graph-page.type.ts';
import { FOCUS_PACKAGE_TITLE } from '../common/graph.const.ts';
import { focusNameOf, groupStateOf, isFiltered, isGroupLocked, rowViewOf } from '../utils/controls-rules.util.ts';
import { controlsLabelOf, countTextOf, folderTitleOf, folderToggleLabelOf, showAllTextOf } from '../utils/controls-text.util.ts';
import { focusFolderOf } from '../utils/folder-rules.util.ts';
import { matchesSearch } from '../utils/search.util.ts';

const setDisabled = (element: HTMLElement, isDisabled: boolean): void => {
  element.setAttribute('aria-disabled', String(isDisabled));
};

/** A Focus toggle shows its state by `aria-pressed` under a constant name; its hover title says what a press does. */
const setFocusToggle = (button: HTMLButtonElement, isFocus: boolean, focusTitle: string): void => {
  const title = isFocus ? CLEAR_FOCUS_LABEL : focusTitle;

  button.setAttribute('aria-pressed', String(isFocus));
  button.title = title;
};

const renderRow = (row: ControlsRow, view: ControlsView): void => {
  const { filters, visible, selected } = view;
  const rowView = rowViewOf(filters, visible, row.name);
  const focusName = focusNameOf(filters);

  row.check.checked = rowView.isChecked;
  setDisabled(row.check, rowView.isLocked);
  setDisabled(row.pick, !visible.has(row.name));
  row.line.classList.toggle('is-dimmed', rowView.isDimmed);
  row.line.setAttribute('aria-current', String(row.name === selected));
  setFocusToggle(row.focus, focusName === row.name, FOCUS_PACKAGE_TITLE);
};

const renderToggle = (group: ControlsGroup, view: ControlsView): void => {
  const { toggle, folder } = group;
  const isCollapsed = view.collapsed.has(folder);
  const title = folderTitleOf(folder);
  const icon = isCollapsed ? 'chevron-right' : 'chevron-down';

  toggle.hidden = !view.grouped;
  setButtonIcon(toggle, icon);
  setButtonLabel(toggle, folderToggleLabelOf(title, isCollapsed));
  toggle.setAttribute('aria-expanded', String(!isCollapsed));
};

const renderFocus = (group: ControlsGroup, view: ControlsView): void => {
  const { focus, folder } = group;
  const isFocus = focusFolderOf(view.filters) === folder;

  focus.hidden = !view.grouped;
  setFocusToggle(focus, isFocus, FOCUS_FOLDER_LABEL);
};

const renderGroup = (group: ControlsGroup, view: ControlsView): void => {
  const names = group.rows.map((row) => row.name);
  const state = groupStateOf(view.filters, names);

  renderToggle(group, view);
  renderFocus(group, view);

  group.check.checked = state === 'checked';
  group.check.indeterminate = state === 'mixed';
  setDisabled(group.check, isGroupLocked(view.filters, names));

  for (const row of group.rows) renderRow(row, view);
};

/**
 * Paints the attributes only, never rebuilds. An indeterminate group box is unchecked, so activating it checks all.
 * A folder header's toggle draws a down chevron while expanded and a right one while collapsed, named and titled Collapse or Expand folder;
 * its Focus toggle, like each row's, keeps its name, reads `aria-pressed` while its folder is the focus and is then titled Clear focus.
 * Both header buttons are hidden while flat.
 * Show all is hidden while nothing is filtered, else names how many packages the filters hide.
 * `toggles` are the toolbar's Controls button, which shows the panel's openness, and its "filters on" mark.
 */
export const renderControls = (
  elements: ControlsElements,
  toggles: Pick<PageElements, 'controls' | 'filtersOn'>,
  view: ControlsView
): void => {
  const isOn = isFiltered(view.filters);
  const hiddenCount = Math.max(0, view.total - view.visible.size);

  elements.panel.hidden = !view.isOpen;
  elements.count.textContent = countTextOf(view.visible.size, view.total);
  elements.showAll.hidden = !isOn;
  setButtonText(elements.showAll, showAllTextOf(hiddenCount));
  toggles.controls.setAttribute('aria-label', controlsLabelOf(isOn));
  toggles.controls.setAttribute('aria-expanded', String(view.isOpen));
  toggles.filtersOn.hidden = !isOn;

  for (const group of elements.groups) renderGroup(group, view);
};

const rowMatches = (row: ControlsRow, byName: Map<string, GraphPackage>, search: string): boolean => {
  const info = byName.get(row.name);

  if (info === undefined) return false;

  return matchesSearch(info, search);
};

const renderGroupSearch = (group: ControlsGroup, byName: Map<string, GraphPackage>, search: string): void => {
  let hasMatch = false;

  for (const row of group.rows) {
    const isMatch = rowMatches(row, byName, search);

    row.line.hidden = !isMatch;
    hasMatch ||= isMatch;
  }

  group.line.hidden = !hasMatch;
};

/** Scrolls the selected row into view; a collapsed panel or a row the search left out stays put, and focus never moves. */
export const revealSelected = (elements: ControlsElements, name: string | null, isOpen: boolean): void => {
  if (name === null || !isOpen) return;

  const rows = elements.groups.flatMap((group) => group.rows);
  const row = rows.find((candidate) => candidate.name === name);

  if (row === undefined || row.line.hidden) return;

  row.line.scrollIntoView({ block: 'nearest' });
};

/** Hides the rows whose name and path miss `search`, and a group with no row left; the filters are untouched. */
export const renderSearch = (elements: ControlsElements, infos: GraphPackage[], search: string): void => {
  const byName = new Map(infos.map((info): [string, GraphPackage] => [info.name, info]));

  for (const group of elements.groups) renderGroupSearch(group, byName, search);
};
