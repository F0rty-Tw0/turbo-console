import { moduleInputOf } from './graph-module-input.ts';
import { GraphModuleLayout } from './graph-module-layout.ts';
import { GraphModuleMode } from './graph-module-mode.ts';
import { moduleScreenOf } from './graph-module-screen.ts';
import { layoutScreenOf, showFailure } from './graph-page-states.ts';
import type { GraphPackageModulesMessage, GraphShowModulesMessage } from '../../bridge/common/graph-modules.type.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { MODULES_DROPPED_WARNING } from '../common/graph-module.const.ts';
import type { GraphControllerDeps, GraphView, Viewport } from '../common/graph-page.type.ts';
import { ROOT_TASK_PACKAGE } from '../common/graph-task.const.ts';
import type { ModuleHookModes, ModuleModeHooks, ModuleRedraw, PageModuleMode } from '../common/module-mode.type.ts';
import type { ModuleBox, ModuleLeaf, ModuleMeasures, ModuleShown } from '../common/module-scene.type.ts';
import type { ModulesBarElements } from '../common/modules-bar.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import type { PageTaskMode } from '../common/page-task-mode.type.ts';
import { defaultExpandedOf } from '../utils/module-expand.util.ts';
import { moduleLeafLabelOf } from '../utils/module-text.util.ts';
import { moduleTreeOf } from '../utils/module-tree.util.ts';

const KEEP: ModuleRedraw = { kind: 'keep' };

const FIT: ModuleRedraw = { kind: 'fit' };

/** A card is sized from its drawn label, a box title from its folder name. */
const measuresOf = (deps: GraphControllerDeps): ModuleMeasures => {
  const sizeOf = (leaf: ModuleLeaf): NodeSize => deps.sizeOf(moduleLeafLabelOf(leaf));
  const titleWidthOf = (box: ModuleBox): number => deps.boxTitleSizeOf(box.name).width;
  const measures: ModuleMeasures = { sizeOf, titleWidthOf };

  return measures;
};

/** Re-layout and Retry while Shown: the saved view drawn again, the camera kept. */
const relayoutOf = (mode: GraphModuleMode): void => {
  const view = mode.view();

  if (view !== null) mode.update(view, KEEP);
};

/** A View box changed: the saved view shows the kinds the three boxes read, drawn again with the camera kept; nothing is posted. */
const toggleShown = (mode: GraphModuleMode, bar: ModulesBarElements): void => {
  const view = mode.view();

  if (view === null) return;

  const shown: ModuleShown = { types: bar.types.checked, tests: bar.tests.checked, lazies: bar.lazies.checked };
  const toggled: ModulesViewState = { ...view, shown };

  mode.update(toggled, KEEP);
};

/** Reset view while Shown: the shown package's default expansion, then a fit. */
const resetView = (mode: GraphModuleMode): void => {
  const view = mode.view();
  const phase = mode.phase();

  if (view === null || phase.kind !== 'shown') return;

  const tree = moduleTreeOf(phase.found.files);
  const expanded = defaultExpandedOf(tree);
  const reset: ModulesViewState = { ...view, expanded };

  mode.update(reset, FIT);
};

/** The modules bar drives the mode: Back leaves, Refresh and Retry scan again; the toolbar's root entry opens `//`. */
const wireBar = (page: PageElements, mode: GraphModuleMode): void => {
  const bar = page.modules;
  const refresh = (): void => mode.refresh();
  const toggle = (): void => toggleShown(mode, bar);
  const boxes = [bar.types, bar.tests, bar.lazies];

  bar.back.addEventListener('click', (): void => mode.leave());
  bar.refresh.addEventListener('click', refresh);
  bar.retry.addEventListener('click', refresh);
  bar.reset.addEventListener('click', (): void => resetView(mode));
  page.rootModules.addEventListener('click', (): void => mode.enter(ROOT_TASK_PACKAGE));

  for (const box of boxes) box.addEventListener('change', toggle);
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
  const mode = new GraphModuleMode({ modes, bridge, screen, tasks, onExit, notice, viewport, frames });
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
