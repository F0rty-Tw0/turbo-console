import type { MockInstance } from 'vitest';
import { vi } from 'vitest';

import type { GraphFocus } from '../../../bridge/common/graph-view-state.type.ts';
import type { GraphFilters } from '../../common/graph-filters.type.ts';
import type { MenuItem, MenuItemModel } from '../../common/widget-menu.type.ts';
import type { FolderMenuState, PackageMenuState, ShowFolderState } from '../../common/widget.type.ts';

const SHOWN: ShowFolderState = { checked: 'true', isDisabled: false };

/** The labels of the model's items, a separator as `'---'`. */
export const labelsOf = (model: MenuItemModel[]): string[] =>
  model.map((entry): string => (entry.kind === 'item' ? entry.label : '---'));

/** The item labelled `label`; throws when the model has none. */
export const itemLabelled = (model: MenuItemModel[], label: string): MenuItem => {
  const found = model.find((entry): entry is MenuItem => entry.kind === 'item' && entry.label === label);

  if (found === undefined) throw new Error(`no menu item ${label}`);

  return found;
};

/** An expanded, unfocused folder whose packages are all shown, with `overrides` on top. */
export const folderStateOf = (overrides: Partial<FolderMenuState> = {}): FolderMenuState => {
  const state: FolderMenuState = { isCollapsed: false, isFocus: false, show: SHOWN, ...overrides };

  return state;
};

/** An unfocused package with no visible task whose list checkbox is ticked, with `overrides` on top. */
export const packageStateOf = (overrides: Partial<PackageMenuState> = {}): PackageMenuState => {
  const state: PackageMenuState = { isFocus: false, isShown: true, hasTasks: false, ...overrides };

  return state;
};

/** How many calls every spy of `actions` took, together. */
export const callCountOf = (actions: object): number => {
  const values: unknown[] = Object.values(actions);
  const spies = values.filter((value): value is MockInstance => vi.isMockFunction(value));

  return spies.reduce((total: number, spy): number => total + spy.mock.calls.length, 0);
};

/** Filters with `hidden` unticked and `focus` set, at depth 2 and no tags. */
export const menuFiltersOf = (hidden: string[], focus: GraphFocus | null): GraphFilters => {
  const filters: GraphFilters = { hidden: new Set(hidden), focus, tags: new Set(), depth: 2 };

  return filters;
};
