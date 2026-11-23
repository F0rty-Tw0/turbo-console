import { resetView, toggleShown } from './graph-module-view-edits.ts';
import type { GraphModuleSitesMessage } from '../../bridge/common/graph-module-sites.type.ts';
import type { GraphPackageModulesMessage, GraphShowModulesMessage } from '../../bridge/common/graph-modules.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { MODULES_DROPPED_WARNING, MODULE_REDRAW_KEEP } from '../common/graph-module.const.ts';
import type { GraphControllerDeps } from '../common/graph-page.type.ts';
import { ROOT_TASK_PACKAGE } from '../common/graph-task.const.ts';
import type { ModuleControlsActions, ModuleViewEditMode } from '../common/module-controls.type.ts';
import type { ModuleDetailsActions, ModuleDetailsList } from '../common/module-details.type.ts';
import type { ModuleBarMode, ModuleInputMode, ModuleScanReceiver, PageModuleMode } from '../common/module-mode.type.ts';
import type { ModuleBox, ModuleLeaf, ModuleMeasures, ModuleShown } from '../common/module-scene.type.ts';
import type { ModulePanelSelection, ModuleSitesReceiver } from '../common/module-selection.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import { moduleLeafLabelOf } from '../utils/module-text.util.ts';

/** A card is sized from its drawn label, a box title from its folder name. */
export const measuresOf = (deps: GraphControllerDeps): ModuleMeasures => {
  const sizeOf = (leaf: ModuleLeaf): NodeSize => deps.sizeOf(moduleLeafLabelOf(leaf));
  const titleWidthOf = (box: ModuleBox): number => deps.boxTitleSizeOf(box.name).width;
  const measures: ModuleMeasures = { sizeOf, titleWidthOf };

  return measures;
};

/** Re-layout while Shown, or Failed over a kept graph: the saved view drawn again, the camera kept. */
export const relayoutOf = (mode: Pick<ModuleInputMode, 'view' | 'update'>): void => {
  const view = mode.view();

  if (view !== null) mode.update(view, MODULE_REDRAW_KEEP);
};

/** The modules bar drives the mode: Back leaves, Refresh and Retry scan again; the toolbar's root entry opens `//`. */
export const wireBar = (page: PageElements, mode: ModuleBarMode): void => {
  const bar = page.modules;
  const refresh = (): void => mode.refresh();

  bar.back.addEventListener('click', (): void => mode.leave());
  bar.refresh.addEventListener('click', refresh);
  bar.retry.addEventListener('click', refresh);
  page.rootModules.addEventListener('click', (): void => mode.enter(ROOT_TASK_PACKAGE));
};

/** The package on screen, for the Details panel's openImport; null while off. */
export const packageNameOf = (mode: Pick<ModuleInputMode, 'phase'>): string | null => {
  const phase = mode.phase();

  return phase.kind === 'off' ? null : phase.name;
};

/** The module Controls edit the mode's saved view; depth and Clear focus go through the selection. */
export const controlsActionsOf = (mode: ModuleViewEditMode, selection: ModulePanelSelection): ModuleControlsActions => {
  const actions: ModuleControlsActions = {
    onDepth: (depth: number): void => selection.setDepth(depth),
    onShown: (shown: ModuleShown): void => toggleShown(mode, shown),
    onReset: (): void => resetView(mode),
    onClearFocus: (): void => selection.clearFocus()
  };

  return actions;
};

/** A host message for modules mode: a sites answer goes to the selection, the scan messages to the mode. */
export const moduleReceiverOf = (mode: ModuleScanReceiver, selection: ModuleSitesReceiver): PageModuleMode['receive'] => {
  const receive = (message: GraphPackageModulesMessage | GraphShowModulesMessage | GraphModuleSitesMessage, at: number): void => {
    if (message.type === 'moduleSites') selection.replied(message);
    else mode.receive(message, at);
  };

  return receive;
};

/** Spec §8: a `packageModules` the validator rejects changes nothing but a console warning; Refresh still asks again. */
export const reportDropped = (message: unknown): void => {
  const isModules = isRecord(message) && message['type'] === 'packageModules';

  if (isModules) console.warn(MODULES_DROPPED_WARNING);
};

/** The module Details report to the selection. */
export const detailsActionsOf = (selection: ModulePanelSelection): ModuleDetailsActions => {
  const actions: ModuleDetailsActions = {
    onClear: (): void => selection.clear(),
    onScanAgain: (): void => selection.scanAgain(),
    onFocus: (target: string): void => selection.focus(target),
    onFold: (list: ModuleDetailsList): void => selection.fold(list)
  };

  return actions;
};
