import { wireWidgets } from './graph-widgets-wire.ts';
import { focusingShowTasksOf, packageActionsOf } from './package-actions.ts';
import type { FolderActions } from '../common/folder-actions.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { WidgetHostDeps } from '../common/graph-controls.type.ts';
import type { GraphFilters } from '../common/graph-filters.type.ts';
import type { GraphInspectionDeps } from '../common/graph-inspection.type.ts';
import type {
  MenuSources,
  WidgetFilters,
  WidgetInspection,
  WidgetSources,
  WidgetState,
  WidgetWireDeps,
  WidgetWiring
} from '../common/graph-widgets.type.ts';
import type { PackageActions } from '../common/package-actions.type.ts';
import type { MenuItemModel } from '../common/widget-menu.type.ts';
import type { MenuTarget, PackageMenuState } from '../common/widget.type.ts';
import { focusFolderOf } from '../utils/folder-rules.util.ts';
import { folderMenuOf, folderMenuStateOf, menuTargetOf, packageMenuOf, packageMenuStateOf } from '../utils/widget-menu-model.util.ts';

type FolderSource = Pick<WidgetSources, 'scene'>;

type MenuActions = { readonly package: PackageActions; readonly folder: FolderActions };

/** The folder hooks of the inspection, read when called: `folders` is built after the inspection. */
export const inspectionFoldersOf = (folders: () => GraphInspectionDeps['folders']): GraphInspectionDeps['folders'] => {
  const hooks: GraphInspectionDeps['folders'] = {
    scene: (): FolderScene | null => folders().scene(),
    show: (): void => folders().show(),
    expand: (names): void => folders().expand(names),
    toggle: (folder): void => folders().toggle(folder)
  };

  return hooks;
};

/** A menu's items from the filters, the scene and the tasks as they are when it opens. */
const menuOfFrom = (
  deps: WidgetHostDeps,
  folders: FolderSource,
  controls: WidgetFilters,
  actions: MenuActions
): MenuSources['menuOf'] => {
  const menuOf = (target: MenuTarget): MenuItemModel[] => {
    const filters = controls.applied;

    if (target.kind === 'package') {
      const hasTasks = deps.hasTasks(target.name);
      const state = packageMenuStateOf(target.name, filters, hasTasks);

      return packageMenuOf(target.name, state, actions.package);
    }

    const state = folderMenuStateOf(target.folder, folders.scene(), filters);

    return folderMenuOf(target.folder, state, actions.folder);
  };

  return menuOf;
};

/** What the selected package's toolbar reads, `null` without a selection. */
const packageStateOf = (selected: string | null, filters: GraphFilters, deps: WidgetHostDeps): PackageMenuState | null => {
  if (selected === null) return null;

  return packageMenuStateOf(selected, filters, deps.hasTasks(selected));
};

/** The wired layer and its menus, reading the mode on screen, the folder scene, the selection and the filters when used. */
export const widgetsOf = (
  deps: WidgetHostDeps,
  inspection: WidgetInspection,
  folders: FolderSource,
  controls: WidgetFilters
): WidgetWiring => {
  const { page, view, widgetViews, overlay, canAct, canActOnPackage, onLocation } = deps;
  const packageActions = focusingShowTasksOf(packageActionsOf(deps, inspection), page.container);
  const menuActions: MenuActions = { package: packageActions, folder: inspection.folderActions() };
  const state = (): WidgetState => {
    const selected = inspection.selected();
    const current: WidgetState = {
      scene: folders.scene(),
      selectedPackage: selected,
      focusedFolder: focusFolderOf(controls.applied),
      packageState: packageStateOf(selected, controls.applied, deps)
    };

    return current;
  };
  const wireDeps: WidgetWireDeps = {
    page,
    view,
    widgetViews,
    overlay,
    state,
    actions: menuActions.folder,
    packageActions,
    canAct,
    canActOnPackage,
    menuOf: menuOfFrom(deps, folders, controls, menuActions),
    selection: (): MenuTarget | null => menuTargetOf(inspection.current()),
    onLocation
  };

  return wireWidgets(wireDeps);
};
