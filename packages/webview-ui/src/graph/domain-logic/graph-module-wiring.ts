import { GraphModuleControls } from './graph-module-controls.ts';
import { GraphModuleDetails } from './graph-module-details.ts';
import { moduleInputOf } from './graph-module-input.ts';
import { GraphModuleLayout } from './graph-module-layout.ts';
import { GraphModuleMode } from './graph-module-mode.ts';
import { moduleScreenOf } from './graph-module-screen.ts';
import { GraphModuleSelection } from './graph-module-selection.ts';
import {
  controlsActionsOf,
  detailsActionsOf,
  measuresOf,
  moduleReceiverOf,
  packageNameOf,
  relayoutOf,
  wireBar
} from './graph-module-wire-parts.ts';
import { layoutScreenOf, showFailure } from './graph-page-states.ts';
import type { ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { GraphControllerDeps, GraphView, Viewport } from '../common/graph-page.type.ts';
import { DETAILS_ID } from '../common/graph.const.ts';
import type { ModuleDetailsView } from '../common/module-details.type.ts';
import type {
  ModuleHookModes,
  ModuleModeDeps,
  ModuleModeHooks,
  ModuleScreenDeps,
  PageModuleMode
} from '../common/module-mode.type.ts';
import type { ModulePanelHooks } from '../common/module-panels.type.ts';
import type { ModuleScene } from '../common/module-scene.type.ts';
import type { ModuleDetailsSink } from '../common/module-selection.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import type { PageTaskMode } from '../common/page-task-mode.type.ts';

/** The panels and the selection, built after the mode that reports to them. */
type ModulePanelsBuilt = {
  readonly controls: GraphModuleControls;
  readonly details: GraphModuleDetails;
  readonly selection: GraphModuleSelection;
};

/** What the mode and the screen report, and the Details view the selection shows. */
type ModuleReports = Pick<ModuleModeDeps, 'onView' | 'onFound'> & Pick<ModuleScreenDeps, 'onDrawn'> & ModuleDetailsSink;

/**
 * The panels as modules mode calls them: each enters on the saved view, open unless saved closed (spec §6.8), and a
 * scan or an exit resets the selection. `built` is read per call: it gets the panels once they are built, after the mode.
 */
const panelHooksOf = (built: ModulePanelsBuilt[], modes: ModuleHookModes): ModulePanelHooks => {
  const enter = (): void => {
    const view = modes.modules();
    const saved = modes.current();

    if (view === null) return;

    for (const { controls, details } of built) {
      controls.enter(view, saved?.controlsOpen ?? true);
      details.enter(saved?.detailsOpen ?? true);
    }
  };
  const scanning = (name: string): void => {
    for (const { selection } of built) selection.scanning(name);
  };
  const exit = (): void => {
    for (const { controls, details, selection } of built) {
      selection.exit();
      controls.exit();
      details.exit();
    }
  };
  const hooks: ModulePanelHooks = { enter, scanning, exit };

  return hooks;
};

/** What the mode, the screen and the selection report, passed on once the panels and the selection are built. */
const reportsOf = (built: ModulePanelsBuilt[]): ModuleReports => {
  const onView = (view: ModulesViewState): void => {
    for (const { controls, details } of built) {
      controls.setView(view);
      details.setView(view);
    }
  };
  const onFound = (found: ModulesFound): void => {
    for (const { selection } of built) selection.found(found);
  };
  const onDrawn = (scene: ModuleScene): void => {
    for (const { selection } of built) selection.drawn(scene);
  };
  const show = (shown: ModuleDetailsView): void => {
    for (const { details } of built) details.show(shown);
  };
  const reports: ModuleReports = { onView, onFound, onDrawn, show };

  return reports;
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
  const built: ModulePanelsBuilt[] = [];
  const { onView, onFound, onDrawn, show } = reportsOf(built);
  const screen = moduleScreenOf({ page, layout, showGraph, onDrawn });
  const panels = panelHooksOf(built, modes);
  const mode = new GraphModuleMode({ modes, bridge, screen, tasks, onExit, notice, viewport, frames, onView, panels, onFound });
  const sink: ModuleDetailsSink = { show };
  const selection = new GraphModuleSelection({ mode, canvas: view.modules, bridge, details: sink });
  const shownPackage = (): string | null => packageNameOf(mode);
  const packageAside = (): HTMLElement | null => document.getElementById(DETAILS_ID);
  const actions = detailsActionsOf(selection);
  const views = deps.moduleViews;
  const details = new GraphModuleDetails({ page, views, bridge, modes, packageName: shownPackage, packageAside, actions });
  const controls = new GraphModuleControls({ page, views, modes, actions: controlsActionsOf(mode, selection) });
  const input = moduleInputOf({ mode, canvas: view.modules, container: page.container, bridge, selection });
  const leave = (): void => mode.leave();
  const modules: PageModuleMode = {
    isActive: (): boolean => mode.isActive(),
    received: (state: GraphReady): void => mode.received(state),
    enter: (packageName: string): void => mode.enter(packageName),
    leave,
    receive: moduleReceiverOf(mode, selection),
    suspend: (): void => mode.suspend(),
    relayout: (): void => relayoutOf(mode),
    input
  };

  built.push({ controls, details, selection });
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
