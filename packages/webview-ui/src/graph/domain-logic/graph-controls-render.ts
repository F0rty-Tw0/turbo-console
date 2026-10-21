import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { ControlsElements, ControlsGroup, ControlsRow } from '../common/controls-elements.type.ts';
import type { ControlsView } from '../common/graph-controls.type.ts';
import { groupStateOf, isFiltered, isGroupLocked, rowViewOf } from '../utils/controls-rules.util.ts';
import { controlsLabelOf, countTextOf } from '../utils/controls-text.util.ts';
import { matchesSearch } from '../utils/search.util.ts';

const setDisabled = (element: HTMLElement, isDisabled: boolean): void => {
  element.setAttribute('aria-disabled', String(isDisabled));
};

const renderRow = (row: ControlsRow, view: ControlsView): void => {
  const { filters, visible, selected } = view;
  const rowView = rowViewOf(filters, visible, row.name);

  row.check.checked = rowView.isChecked;
  setDisabled(row.check, rowView.isLocked);
  setDisabled(row.pick, !visible.has(row.name));
  row.line.classList.toggle('is-dimmed', rowView.isDimmed);
  row.line.setAttribute('aria-current', String(row.name === selected));
};

const renderGroup = (group: ControlsGroup, view: ControlsView): void => {
  const names = group.rows.map((row) => row.name);
  const state = groupStateOf(view.filters, names);

  group.check.checked = state === 'checked';
  group.check.indeterminate = state === 'mixed';
  setDisabled(group.check, isGroupLocked(view.filters, names));

  for (const row of group.rows) renderRow(row, view);
};

/**
 * Paints the attributes only, never rebuilds. An indeterminate group box is unchecked, so activating it checks all.
 * `toggle` is the toolbar's Controls button, which shows the panel's openness and a dot while filters are on.
 */
export const renderControls = (elements: ControlsElements, toggle: HTMLButtonElement, view: ControlsView): void => {
  const isOn = isFiltered(view.filters);

  elements.panel.hidden = !view.isOpen;
  elements.count.textContent = countTextOf(view.visible.size, view.total);
  setDisabled(elements.showAll, !isOn);
  toggle.setAttribute('aria-label', controlsLabelOf(isOn));
  toggle.setAttribute('aria-expanded', String(view.isOpen));
  toggle.classList.toggle('has-filters', isOn);

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

/** Hides the rows whose name and path miss `search`, and a group with no row left; the filters are untouched. */
export const renderSearch = (elements: ControlsElements, infos: GraphPackage[], search: string): void => {
  const byName = new Map(infos.map((info): [string, GraphPackage] => [info.name, info]));

  for (const group of elements.groups) renderGroupSearch(group, byName, search);
};
