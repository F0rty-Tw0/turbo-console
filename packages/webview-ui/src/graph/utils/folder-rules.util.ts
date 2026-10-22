import { focusClearedOf, groupStateOf, toggleGroup } from './controls-rules.util.ts';
import { namesInFolderOf } from './folder-group.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';

/** The folder of a folder focus; a package focus or no focus is `null`. */
export const focusFolderOf = (filters: GraphFilters): string | null => {
  if (filters.focus?.kind !== 'folder') return null;

  return filters.focus.folder;
};

/** Clears a folder focus only; a package focus or no focus gives `filters` itself. */
export const clearFolderFocusOf = (filters: GraphFilters): GraphFilters => {
  const folder = focusFolderOf(filters);

  if (folder === null) return filters;

  return focusClearedOf(filters);
};

/** Unticks every package of `folder` as the group checkbox does; the focused package is skipped. */
export const excludeFolderOf = (filters: GraphFilters, infos: GraphPackage[], folder: string): GraphFilters => {
  const names = namesInFolderOf(infos, folder);

  return toggleGroup(filters, names, false);
};

/** The group checkbox twin: checks all when the state is not `checked` (`mixed` too), else unchecks all. */
export const showFolderOf = (filters: GraphFilters, infos: GraphPackage[], folder: string): GraphFilters => {
  const names = namesInFolderOf(infos, folder);
  const state = groupStateOf(filters, names);

  return toggleGroup(filters, names, state !== 'checked');
};
