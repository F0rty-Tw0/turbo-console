import { focusNameOf, rowViewOf } from './controls-rules.util.ts';
import { folderToggleTextOf } from './controls-text.util.ts';
import { focusFolderOf } from './folder-rules.util.ts';
import { showFolderOf } from './show-folder.util.ts';
import { CLEAR_FOCUS_LABEL, FOCUS_FOLDER_LABEL, FOCUS_LABEL, OPEN_DETAILS_LABEL, START_TRACE_LABEL } from '../common/details.const.ts';
import type { FolderActions } from '../common/folder-actions.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import { SHOW_TASKS_LABEL } from '../common/graph-task.const.ts';
import { SHOW_FOLDER_LABEL, SHOW_PACKAGE_LABEL } from '../common/graph.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { PackageActions } from '../common/package-actions.type.ts';
import type { MenuItem, MenuItemModel } from '../common/widget-menu.type.ts';
import type { FolderMenuState, MenuTarget, PackageMenuState } from '../common/widget.type.ts';

const SEPARATOR: MenuItemModel = { kind: 'separator' };

const NO_ITEMS: MenuItemModel[] = [];

export const itemOf = (label: string, run: () => void): MenuItem => {
  const item: MenuItem = { kind: 'item', label, role: 'menuitem', checked: null, isDisabled: false, run };

  return item;
};

const checkItemOf = (label: string, checked: MenuItem['checked'], isDisabled: boolean, run: () => void): MenuItem => {
  const item: MenuItem = { kind: 'item', label, role: 'menuitemcheckbox', checked, isDisabled, run };

  return item;
};

export const isMenuItem = (entry: MenuItemModel): entry is MenuItem => entry.kind === 'item';

/** Expand or Collapse · Focus folder or Clear focus · separator · Show folder, the group checkbox's twin. */
export const folderMenuOf = (folder: string, state: FolderMenuState, actions: FolderActions): MenuItemModel[] => {
  const toggleLabel = folderToggleTextOf(state.isCollapsed);
  const toggle = itemOf(toggleLabel, (): void => actions.toggle(folder));
  const clear = itemOf(CLEAR_FOCUS_LABEL, (): void => actions.clearFocus());
  const focusOn = itemOf(FOCUS_FOLDER_LABEL, (): void => actions.focusFolder(folder));
  const focus = state.isFocus ? clear : focusOn;
  const { checked, isDisabled } = state.show;
  const show = checkItemOf(SHOW_FOLDER_LABEL, checked, isDisabled, (): void => actions.showFolder(folder));
  const model: MenuItemModel[] = [toggle, focus, SEPARATOR, show];

  return model;
};

/**
 * View Package Details · Focus or Clear focus · Start trace · Show tasks, for a package with a visible task · separator
 * · Show package, the list checkbox's twin, locked while focused.
 */
export const packageMenuOf = (name: string, state: PackageMenuState, actions: PackageActions): MenuItemModel[] => {
  const details = itemOf(OPEN_DETAILS_LABEL, (): void => actions.openDetails(name));
  const clear = itemOf(CLEAR_FOCUS_LABEL, (): void => actions.clearFocus());
  const focusOn = itemOf(FOCUS_LABEL, (): void => actions.focus(name));
  const focus = state.isFocus ? clear : focusOn;
  const trace = itemOf(START_TRACE_LABEL, (): void => actions.startTrace());
  const showTasks = itemOf(SHOW_TASKS_LABEL, (): void => actions.showTasks(name));
  const taskItems: MenuItemModel[] = [showTasks];
  const tasks = state.hasTasks ? taskItems : NO_ITEMS;
  const checked = state.isShown ? 'true' : 'false';
  const show = checkItemOf(SHOW_PACKAGE_LABEL, checked, state.isFocus, (): void => actions.setShown(name, !state.isShown));
  const model: MenuItemModel[] = [details, focus, trace, ...tasks, SEPARATOR, show];

  return model;
};

/** A folder's menu state: collapsed in the scene, the folder focus, and "Show folder" from its packages' group checkbox. */
export const folderMenuStateOf = (folder: string, scene: FolderScene | null, filters: GraphFilters): FolderMenuState => {
  const isCollapsed = scene?.collapsed.has(folder) ?? false;
  const isFocus = focusFolderOf(filters) === folder;
  const names = scene?.members.get(folder) ?? [];
  const show = showFolderOf(filters, names);
  const state: FolderMenuState = { isCollapsed, isFocus, show };

  return state;
};

/** A package's menu state: the package focus, "Show package" from its list checkbox, and whether it has a visible task. */
export const packageMenuStateOf = (
  name: string,
  filters: GraphFilters,
  visible: ReadonlySet<string>,
  hasTasks: boolean
): PackageMenuState => {
  const isFocus = focusNameOf(filters) === name;
  const { isChecked } = rowViewOf(filters, visible, name);
  const state: PackageMenuState = { isFocus, isShown: isChecked, hasTasks };

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
