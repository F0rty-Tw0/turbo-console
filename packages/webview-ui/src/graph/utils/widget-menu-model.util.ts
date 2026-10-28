import { focusNameOf } from './controls-rules.util.ts';
import { folderToggleTextOf } from './controls-text.util.ts';
import { focusFolderOf } from './folder-rules.util.ts';
import { showFolderChecksOf, showFolderOf } from './show-folder.util.ts';
import {
  CLEAR_FOCUS_LABEL,
  EXCLUDE_FOLDER_LABEL,
  EXCLUDE_LABEL,
  FOCUS_FOLDER_LABEL,
  FOCUS_LABEL,
  OPEN_DETAILS_LABEL,
  SHOW_ALL_IN_FOLDER_LABEL,
  START_TRACE_LABEL,
  START_TRACE_TITLE
} from '../common/details.const.ts';
import type { FolderActions } from '../common/folder-actions.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import { ACTION_ICONS } from '../common/graph-icon.const.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';
import { SHOW_TASKS_LABEL } from '../common/graph-task.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { PackageActions } from '../common/package-actions.type.ts';
import type { MenuItem, MenuItemModel } from '../common/widget-menu.type.ts';
import type { FolderMenuState, MenuTarget, PackageMenuState } from '../common/widget.type.ts';

const SEPARATOR: MenuItemModel = { kind: 'separator' };

const NO_ITEMS: MenuItemModel[] = [];

export const itemOf = (label: string, icon: GraphIconId | null, run: () => void, title?: string): MenuItem => {
  const item: MenuItem = { kind: 'item', label, icon, isDisabled: false, run };

  if (title === undefined) return item;

  const titled: MenuItem = { ...item, title };

  return titled;
};

export const isMenuItem = (entry: MenuItemModel): entry is MenuItem => entry.kind === 'item';

/**
 * Expand or Collapse · Focus folder or Clear focus · separator · Exclude folder, or Show all in folder while a package
 * of it is hidden: the group checkbox's click, locked with it.
 */
export const folderMenuOf = (folder: string, state: FolderMenuState, actions: FolderActions): MenuItemModel[] => {
  const toggleLabel = folderToggleTextOf(state.isCollapsed);
  const toggleIcon = state.isCollapsed ? ACTION_ICONS.expand : ACTION_ICONS.collapse;
  const toggle = itemOf(toggleLabel, toggleIcon, (): void => actions.toggle(folder));
  const clear = itemOf(CLEAR_FOCUS_LABEL, ACTION_ICONS.clearFocus, (): void => actions.clearFocus());
  const focusOn = itemOf(FOCUS_FOLDER_LABEL, ACTION_ICONS.focus, (): void => actions.focusFolder(folder));
  const focus = state.isFocus ? clear : focusOn;
  const runShow = (): void => actions.showFolder(folder);
  const showAll = itemOf(SHOW_ALL_IN_FOLDER_LABEL, ACTION_ICONS.showAll, runShow);
  const exclude = itemOf(EXCLUDE_FOLDER_LABEL, ACTION_ICONS.exclude, runShow);
  const showItem = showFolderChecksOf(state.show) ? showAll : exclude;
  const show: MenuItem = { ...showItem, isDisabled: state.show.isDisabled };
  const model: MenuItemModel[] = [toggle, focus, SEPARATOR, show];

  return model;
};

/**
 * View Package Details · Focus or Clear focus · Start trace · Show tasks, for a package with a visible task · separator
 * · Exclude, the list checkbox's untick, locked while focused.
 */
export const packageMenuOf = (name: string, state: PackageMenuState, actions: PackageActions): MenuItemModel[] => {
  const details = itemOf(OPEN_DETAILS_LABEL, ACTION_ICONS.openDetails, (): void => actions.openDetails(name));
  const clear = itemOf(CLEAR_FOCUS_LABEL, ACTION_ICONS.clearFocus, (): void => actions.clearFocus());
  const focusOn = itemOf(FOCUS_LABEL, ACTION_ICONS.focus, (): void => actions.focus(name));
  const focus = state.isFocus ? clear : focusOn;
  const trace = itemOf(START_TRACE_LABEL, ACTION_ICONS.startTrace, (): void => actions.startTrace(), START_TRACE_TITLE);
  const showTasks = itemOf(SHOW_TASKS_LABEL, ACTION_ICONS.showTasks, (): void => actions.showTasks(name));
  const taskItems: MenuItemModel[] = [showTasks];
  const tasks = state.hasTasks ? taskItems : NO_ITEMS;
  const excludeItem = itemOf(EXCLUDE_LABEL, ACTION_ICONS.exclude, (): void => actions.setShown(name, false));
  const exclude: MenuItem = { ...excludeItem, isDisabled: state.isFocus };
  const model: MenuItemModel[] = [details, focus, trace, ...tasks, SEPARATOR, exclude];

  return model;
};

/** A folder's menu state: collapsed in the scene, the folder focus, and its packages' group checkbox state. */
export const folderMenuStateOf = (folder: string, scene: FolderScene | null, filters: GraphFilters): FolderMenuState => {
  const isCollapsed = scene?.collapsed.has(folder) ?? false;
  const isFocus = focusFolderOf(filters) === folder;
  const names = scene?.members.get(folder) ?? [];
  const show = showFolderOf(filters, names);
  const state: FolderMenuState = { isCollapsed, isFocus, show };

  return state;
};

/** A package's menu state: the package focus and whether it has a visible task. */
export const packageMenuStateOf = (name: string, filters: GraphFilters, hasTasks: boolean): PackageMenuState => {
  const isFocus = focusNameOf(filters) === name;
  const state: PackageMenuState = { isFocus, hasTasks };

  return state;
};

/** What Shift+F10 opens a menu for: an inspected folder or package; a link, picking, trace or nothing has none. */
export const menuTargetOf = (inspection: Inspection): MenuTarget | null => {
  if (inspection.kind === 'folder') {
    const folder: MenuTarget = { kind: 'folder', folder: inspection.folder };

    return folder;
  }

  if (inspection.kind !== 'package') return null;

  const named: MenuTarget = { kind: 'package', name: inspection.name };

  return named;
};
