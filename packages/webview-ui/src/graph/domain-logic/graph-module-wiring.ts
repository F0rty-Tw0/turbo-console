import { moduleInputOf } from './graph-module-input.ts';
import { GraphModuleLayout } from './graph-module-layout.ts';
import { GraphModuleMode } from './graph-module-mode.ts';
import { layoutScreenOf, showFailure } from './graph-page-states.ts';
import type { GraphPackageModulesMessage, GraphShowModulesMessage, ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { MODULES_DROPPED_WARNING, MODULES_MODE_CLASS } from '../common/graph-module.const.ts';
import type { GraphControllerDeps, GraphView, Viewport } from '../common/graph-page.type.ts';
import type { ModuleHookModes, ModuleModeHooks, ModuleRedraw, ModuleScreen, PageModuleMode } from '../common/module-mode.type.ts';
import type { ModuleBox, ModuleLeaf, ModuleMeasures } from '../common/module-scene.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import { moduleLeafLabelOf } from '../utils/module-text.util.ts';

type ModuleScreenPage = Pick<PageElements, 'root' | 'packagesMode' | 'taskMode'>;

const KEEP: ModuleRedraw = { kind: 'keep' };

/** A card is sized from its drawn label, a box title from its folder name. */
const measuresOf = (deps: GraphControllerDeps): ModuleMeasures => {
  const sizeOf = (leaf: ModuleLeaf): NodeSize => deps.sizeOf(moduleLeafLabelOf(leaf));
  const titleWidthOf = (box: ModuleBox): number => deps.boxTitleSizeOf(box.name).width;
  const measures: ModuleMeasures = { sizeOf, titleWidthOf };

  return measures;
};

/**
 * The modules screen: the `modules-mode` class on the page and the mode buttons, neither pressed while it shows; Waiting
 * and Loading empty the canvas, Shown draws, Failed empties it only when no graph is drawn, and leaving clears it and
 * presses Packages again, which task mode's enter undoes on a leave to tasks. The bar and banners come later.
 */
const moduleScreenOf = (page: ModuleScreenPage, layout: GraphModuleLayout, view: GraphView): ModuleScreen => {
  const enter = (): void => {
    page.root.classList.add(MODULES_MODE_CLASS);
    page.packagesMode.setAttribute('aria-pressed', 'false');
    page.taskMode.setAttribute('aria-pressed', 'false');
  };
  const scanning = (): void => layout.clear();
  const shown = (_name: string, found: ModulesFound, state: ModulesViewState, redraw: ModuleRedraw): void => {
    void layout.draw(found, state, redraw);
  };
  const failed = (): void => {
    const drawn = layout.scene();

    if (drawn === null) view.modules.clear();
  };
  const exit = (): void => {
    layout.clear();
    page.root.classList.remove(MODULES_MODE_CLASS);
    page.packagesMode.setAttribute('aria-pressed', 'true');
  };
  const screen: ModuleScreen = { enter, scanning, shown, failed, exit };

  return screen;
};

/** Re-layout and Retry while Shown: the saved view drawn again, the camera kept. */
const relayoutOf = (mode: GraphModuleMode): void => {
  const view = mode.view();

  if (view !== null) mode.update(view, KEEP);
};

/** Modules mode over the page; Packages and Tasks leave it, wired before task mode's listeners, so they run first. */
export const moduleModeOf = (deps: GraphControllerDeps, view: GraphView, hooks: ModuleModeHooks): PageModuleMode => {
  const { page, bridge, runner } = deps;
  const notice = (text: string): void => hooks.tasks().notice(text);
  const viewport = (): Viewport => view.viewport();
  const { showNotice } = layoutScreenOf(page);
  const measures = measuresOf(deps);
  const onFailure = (error: unknown): void => showFailure(page, error);
  const layout = new GraphModuleLayout({ view, runner, measures, frames: hooks.frames, showNotice, onFailure });
  const screen = moduleScreenOf(page, layout, view);
  const mode = new GraphModuleMode({ modes: hooks.modes, bridge, screen, tasks: hooks.tasks, onExit: hooks.onExit, notice, viewport });
  const input = moduleInputOf({ mode, canvas: view.modules, bridge });
  const leave = (): void => mode.leave();
  const modules: PageModuleMode = {
    isActive: (): boolean => mode.isActive(),
    received: (state: GraphReady): void => mode.received(state),
    enter: (packageName: string): void => mode.enter(packageName),
    leave,
    receive: (message: GraphPackageModulesMessage | GraphShowModulesMessage): void => mode.receive(message),
    relayout: (): void => relayoutOf(mode),
    input
  };

  page.packagesMode.addEventListener('click', leave);
  page.taskMode.addEventListener('click', leave);

  return modules;
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
