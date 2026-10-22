import { wireWidgets } from './graph-widgets-wire.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { GraphFilteringDeps } from '../common/graph-controls.type.ts';
import type { GraphInspectionDeps } from '../common/graph-inspection.type.ts';
import type { WidgetSources, WidgetState, WidgetWireDeps, WidgetWiring } from '../common/graph-widgets.type.ts';

/** The widget menus open from Task 4.3 on; until then a "…" click does nothing. */
const NO_MENU = (): void => undefined;

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

/** The wired widget layer, reading the mode on screen, the folder scene and the selected package at each refresh. */
export const widgetsOf = (
  deps: GraphFilteringDeps,
  inspection: Pick<WidgetSources, 'selected' | 'folderActions'>,
  folders: Pick<WidgetSources, 'scene'>
): WidgetWiring => {
  const { page, view, widgetViews, overlay, isGrouped, canAct } = deps;
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
    onMenu: NO_MENU
  };

  return wireWidgets(wireDeps);
};
