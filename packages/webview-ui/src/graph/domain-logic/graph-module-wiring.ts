import { GraphModuleMode } from './graph-module-mode.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { MODULES_DROPPED_WARNING, MODULES_MODE_CLASS } from '../common/graph-module.const.ts';
import type { GraphControllerDeps, GraphView, Viewport } from '../common/graph-page.type.ts';
import type { ModuleHookModes, ModuleModeHooks, ModuleScreen, PageModuleMode } from '../common/module-mode.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';

type ModuleScreenPage = Pick<PageElements, 'root' | 'packagesMode' | 'taskMode'>;

const NOTHING = (): void => undefined;

/**
 * The modules screen: for now only the `modules-mode` class on the page and the mode buttons, neither pressed while it
 * shows; the canvas, bar and banners come later. Leaving presses Packages again, which task mode's enter undoes on a
 * leave to tasks.
 */
const moduleScreenOf = (page: ModuleScreenPage): ModuleScreen => {
  const enter = (): void => {
    page.root.classList.add(MODULES_MODE_CLASS);
    page.packagesMode.setAttribute('aria-pressed', 'false');
    page.taskMode.setAttribute('aria-pressed', 'false');
  };
  const exit = (): void => {
    page.root.classList.remove(MODULES_MODE_CLASS);
    page.packagesMode.setAttribute('aria-pressed', 'true');
  };
  const screen: ModuleScreen = { enter, scanning: NOTHING, shown: NOTHING, failed: NOTHING, exit };

  return screen;
};

/** Modules mode over the page; Packages and Tasks leave it, wired before task mode's listeners, so they run first. */
export const moduleModeOf = (deps: GraphControllerDeps, view: GraphView, hooks: ModuleModeHooks): GraphModuleMode => {
  const { page, bridge } = deps;
  const notice = (text: string): void => hooks.tasks().notice(text);
  const viewport = (): Viewport => view.viewport();
  const screen = moduleScreenOf(page);
  const mode = new GraphModuleMode({ modes: hooks.modes, bridge, screen, tasks: hooks.tasks, onExit: hooks.onExit, notice, viewport });
  const leave = (): void => mode.leave();

  page.packagesMode.addEventListener('click', leave);
  page.taskMode.addEventListener('click', leave);

  return mode;
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
