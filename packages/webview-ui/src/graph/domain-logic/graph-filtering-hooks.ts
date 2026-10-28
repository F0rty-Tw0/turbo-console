import { wireWidgets } from './graph-widgets-wire.ts';
import { packageActionsOf } from './package-actions.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { WidgetHostDeps } from '../common/graph-controls.type.ts';
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
import type { MenuItemModel } from '../common/widget-menu.type.ts';
import type { MenuTarget } from '../common/widget.type.ts';
import { folderMenuOf, folderMenuStateOf, menuTargetOf, packageMenuOf, packageMenuStateOf } from '../utils/widget-menu-model.util.ts';

type FolderSource = Pick<WidgetSources, 'scene'>;

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
  inspection: WidgetInspection,
  folders: FolderSource,
  controls: WidgetFilters
): MenuSources['menuOf'] => {
  const packageActions = packageActionsOf(deps, inspection);
  const menuOf = (target: MenuTarget): MenuItemModel[] => {
    const filters = controls.applied;

    if (target.kind === 'package') {
      const hasTasks = deps.hasTasks(target.name);
      const state = packageMenuStateOf(target.name, filters, hasTasks);

      return packageMenuOf(target.name, state, packageActions);
    }

    const state = folderMenuStateOf(target.folder, folders.scene(), filters);

    return folderMenuOf(target.folder, state, inspection.folderActions());
  };

  return menuOf;
};

/** The wired layer, its menus and the breadcrumb, reading the mode on screen, the folder scene, the selection and the filters when used. */
export const widgetsOf = (
  deps: WidgetHostDeps,
  inspection: WidgetInspection,
  folders: FolderSource,
  controls: WidgetFilters
): WidgetWiring => {
  const { page, view, widgetViews, overlay, isGrouped, canAct, drawn, focusedFolder, onClearFocus } = deps;
  const state = (): WidgetState => {
    const current: WidgetState = { isGrouped: isGrouped(), scene: folders.scene(), selectedPackage: inspection.selected() };

    return current;
  };
  const wireDeps: WidgetWireDeps = {
    page,
    view,
    widgetViews,
    overlay,
    state,
    actions: inspection.folderActions(),
    canAct,
    menuOf: menuOfFrom(deps, inspection, folders, controls),
    selection: (): MenuTarget | null => menuTargetOf(inspection.current()),
    focusedFolder,
    drawn,
    clearFocus: onClearFocus
  };

  return wireWidgets(wireDeps);
};
