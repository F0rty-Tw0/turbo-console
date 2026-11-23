import { GraphModuleControls } from './graph-module-controls.ts';
import { moduleInputOf } from './graph-module-input.ts';
import { GraphModuleLayout } from './graph-module-layout.ts';
import { GraphModuleMode } from './graph-module-mode.ts';
import { moduleScreenOf } from './graph-module-screen.ts';
import { depthEdited, focusCleared, resetView, toggleShown } from './graph-module-view-edits.ts';
import { layoutScreenOf, showFailure } from './graph-page-states.ts';
import type { GraphPackageModulesMessage, GraphShowModulesMessage } from '../../bridge/common/graph-modules.type.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { MODULES_DROPPED_WARNING, MODULE_REDRAW_KEEP } from '../common/graph-module.const.ts';
import type { GraphControllerDeps, GraphView, Viewport } from '../common/graph-page.type.ts';
import { ROOT_TASK_PACKAGE } from '../common/graph-task.const.ts';
import type { ModuleControlsActions } from '../common/module-controls.type.ts';
import type { ModuleHookModes, ModuleModeHooks, PageModuleMode } from '../common/module-mode.type.ts';
import type { ModulePanelHooks } from '../common/module-panels.type.ts';
import type { ModuleBox, ModuleLeaf, ModuleMeasures, ModuleShown } from '../common/module-scene.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import type { PageTaskMode } from '../common/page-task-mode.type.ts';
import { moduleLeafLabelOf } from '../utils/module-text.util.ts';

/** A card is sized from its drawn label, a box title from its folder name. */
const measuresOf = (deps: GraphControllerDeps): ModuleMeasures => {
  const sizeOf = (leaf: ModuleLeaf): NodeSize => deps.sizeOf(moduleLeafLabelOf(leaf));
  const titleWidthOf = (box: ModuleBox): number => deps.boxTitleSizeOf(box.name).width;
  const measures: ModuleMeasures = { sizeOf, titleWidthOf };

  return measures;
};

/** Re-layout while Shown, or Failed over a kept graph: the saved view drawn again, the camera kept. */
const relayoutOf = (mode: GraphModuleMode): void => {
  const view = mode.view();

  if (view !== null) mode.update(view, MODULE_REDRAW_KEEP);
};

/** The modules bar drives the mode: Back leaves, Refresh and Retry scan again; the toolbar's root entry opens `//`. */
const wireBar = (page: PageElements, mode: GraphModuleMode): void => {
  const bar = page.modules;
  const refresh = (): void => mode.refresh();

  bar.back.addEventListener('click', (): void => mode.leave());
  bar.refresh.addEventListener('click', refresh);
  bar.retry.addEventListener('click', refresh);
  page.rootModules.addEventListener('click', (): void => mode.enter(ROOT_TASK_PACKAGE));
};

/** The module Controls edit the mode's saved view. */
const controlsActionsOf = (mode: GraphModuleMode): ModuleControlsActions => {
  const actions: ModuleControlsActions = {
    onDepth: (depth: number): void => depthEdited(mode, depth),
    onShown: (shown: ModuleShown): void => toggleShown(mode, shown),
    onReset: (): void => resetView(mode),
    onClearFocus: (): void => focusCleared(mode)
  };

  return actions;
};

/**
 * The panels as modules mode calls them: the Controls enter on the saved view, open unless saved closed (spec §6.8).
 * `built` is read per call: it gets the one Controls panel once that is built, after the mode it edits.
 */
const panelHooksOf = (built: GraphModuleControls[], modes: ModuleHookModes): ModulePanelHooks => {
  const enter = (): void => {
    const view = modes.modules();
    const isOpen = modes.current()?.controlsOpen ?? true;

    if (view === null) return;

    for (const controls of built) controls.enter(view, isOpen);
  };
  const exit = (): void => {
    for (const controls of built) controls.exit();
  };
  const hooks: ModulePanelHooks = { enter, scanning: (): void => undefined, exit };

  return hooks;
};

/** Every saved modules view reaches the Controls panel once it is built. */
const viewSyncOf = (built: GraphModuleControls[]): ((view: ModulesViewState) => void) => {
  const onView = (view: ModulesViewState): void => {
    for (const controls of built) controls.setView(view);
  };

  return onView;
};

/** The Packages/Tasks group shows unless the root is a single package, where the toolbar's Show modules shows instead. */
export const modeGroupHiderOf = (
  page: Pick<PageElements, 'modeGroup' | 'modeEnd' | 'rootModulesGroup'>
): ((isHidden: boolean) => void) => {
  const hideModes = (isHidden: boolean): void => {
    page.modeGroup.hidden = isHidden;
    page.modeEnd.hidden = isHidden;
    page.rootModulesGroup.hidden = !isHidden;
  };

  return hideModes;
};

/** Modules mode over the page; Packages and Tasks leave it, wired before task mode's listeners, so they run first. */
export const moduleModeOf = (deps: GraphControllerDeps, view: GraphView, hooks: ModuleModeHooks): PageModuleMode => {
  const { page, bridge, runner } = deps;
  const { frames, modes, onExit, tasks } = hooks;
  const notice = (text: string): void => hooks.tasks().notice(text);
  const viewport = (): Viewport => view.viewport();
  const { showGraph } = layoutScreenOf(page);
  const measures = measuresOf(deps);
  const onFailure = (error: unknown): void => showFailure(page, error);
  const layout = new GraphModuleLayout({ view, runner, measures, frames, showGraph, onFailure });
  const screen = moduleScreenOf({ page, layout, showGraph });
  const built: GraphModuleControls[] = [];
  const onView = viewSyncOf(built);
  const panels = panelHooksOf(built, modes);
  const mode = new GraphModuleMode({ modes, bridge, screen, tasks, onExit, notice, viewport, frames, onView, panels });
  const actions = controlsActionsOf(mode);
  const controls = new GraphModuleControls({ page, views: deps.moduleViews, modes, actions });
  const input = moduleInputOf({ mode, canvas: view.modules, container: page.container, bridge });
  const leave = (): void => mode.leave();
  const modules: PageModuleMode = {
    isActive: (): boolean => mode.isActive(),
    received: (state: GraphReady): void => mode.received(state),
    enter: (packageName: string): void => mode.enter(packageName),
    leave,
    receive: (message: GraphPackageModulesMessage | GraphShowModulesMessage, at: number): void => mode.receive(message, at),
    suspend: (): void => mode.suspend(),
    relayout: (): void => relayoutOf(mode),
    input
  };

  built.push(controls);
  page.packagesMode.addEventListener('click', leave);
  page.taskMode.addEventListener('click', leave);
  wireBar(page, mode);

  return modules;
};

/** A host message replaced the page: task and modules mode each take it back on the next graph state. Both are read per call. */
export const messageSuspenderOf = (
  tasks: () => Pick<PageTaskMode, 'suspend'>,
  modules: () => Pick<PageModuleMode, 'suspend'>
): (() => void) => {
  const onMessage = (): void => {
    tasks().suspend();
    modules().suspend();
  };

  return onMessage;
};

/** A reload saved in modules mode enters its package again, Waiting for the first graph state; called once task mode is built. */
export const resumeModules = (mode: Pick<PageModuleMode, 'enter'>, modes: ModuleHookModes): void => {
  const saved = modes.modules();
  const savedMode = modes.mode();

  if (savedMode === 'modules' && saved !== null) mode.enter(saved.packageName);
};

/** Spec §8: a `packageModules` the validator rejects changes nothing but a console warning; Refresh still asks again. */
export const reportDropped = (message: unknown): void => {
  const isModules = isRecord(message) && message['type'] === 'packageModules';

  if (isModules) console.warn(MODULES_DROPPED_WARNING);
};
