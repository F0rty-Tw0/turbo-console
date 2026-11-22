import type { FrameClock } from './frame-clock.type.ts';
import type { LayoutScreen } from './graph-layouts.type.ts';
import type { GraphView, Viewport } from './graph-page.type.ts';
import type { TaskModes } from './graph-task.type.ts';
import type { LayoutRunner } from './layout.type.ts';
import type { HandledModules, ModuleCanvas } from './module-canvas.type.ts';
import type { ModuleMeasures, ModuleScene } from './module-scene.type.ts';
import type { PageElements } from './page-elements.type.ts';
import type { PageTaskMode } from './page-task-mode.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphPackageModulesMessage, GraphShowModulesMessage, ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewMode, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';

/** Where Back leaves to: tasks on a single-package repo, packages otherwise (spec §7.2 "Leave"). */
export type ModuleExit = 'packages' | 'tasks';

type ModulePhaseOff = { readonly kind: 'off' };

type ModulePhaseWaiting = { readonly kind: 'waiting'; readonly name: string };

type ModulePhaseLoading = { readonly kind: 'loading'; readonly name: string };

type ModulePhaseShown = { readonly kind: 'shown'; readonly name: string; readonly found: ModulesFound };

type ModulePhaseFailed = { readonly kind: 'failed'; readonly name: string; readonly found: ModulesFound | null };

/** Spec §7.2 rows; `off` is the packages / tasks row. */
export type ModulePhase = ModulePhaseOff | ModulePhaseWaiting | ModulePhaseLoading | ModulePhaseShown | ModulePhaseFailed;

type ModuleRedrawFirst = { readonly kind: 'first' };

type ModuleRedrawKeep = { readonly kind: 'keep' };

type ModuleRedrawAnchor = { readonly kind: 'anchor'; readonly id: string };

type ModuleRedrawFit = { readonly kind: 'fit' };

/** How a draw places the camera: the saved one or a fit, as it was, around a toggled folder, or a fresh fit (spec §7.4). */
export type ModuleRedraw = ModuleRedrawFirst | ModuleRedrawKeep | ModuleRedrawAnchor | ModuleRedrawFit;

/** What the mode asks of the page: the canvas, the modules bar and its banners. */
export type ModuleScreen = {
  readonly enter: () => void;
  /** Waiting and Loading: empty canvas, "Scanning <P>…", Refresh visible. */
  readonly scanning: (name: string) => void;
  readonly shown: (name: string, found: ModulesFound, view: ModulesViewState, redraw: ModuleRedraw) => void;
  /** Keeps the old graph drawn, if any, and shows "Could not scan <P>." with Retry. */
  readonly failed: (name: string) => void;
  readonly exit: () => void;
};

/** What modules mode reads and writes of `ViewStateModes`. */
export type ModuleModes = {
  readonly modules: () => ModulesViewState | null;
  readonly saveModules: (modules: ModulesViewState, hash: string) => void;
  readonly setMode: (mode: GraphViewMode, hash: string) => void;
};

/** Task mode as modules mode sees it: entering from task mode parks it without showing the package graph. */
export type ModuleTaskSide = {
  readonly isActive: () => boolean;
  readonly leave: (to: 'packages' | 'modules') => void;
};

export type ModuleModeDeps = {
  readonly modes: ModuleModes;
  readonly bridge: Pick<Bridge, 'post'>;
  readonly screen: ModuleScreen;
  /** Read per call: task mode is built after modules mode. */
  readonly tasks: () => ModuleTaskSide;
  readonly onExit: (to: ModuleExit) => void;
  readonly notice: (text: string) => void;
  readonly viewport: () => Viewport;
};

/** `ModuleModes` plus the mode, which tells `resumeModules` a reload left the page in modules mode. */
export type ModuleHookModes = ModuleModes & Pick<TaskModes, 'mode'>;

/** Task mode as the module wiring reaches it: the side modules mode parks, and the notice line it writes "P gone" to. */
type ModuleHookTasks = ModuleTaskSide & Pick<PageTaskMode, 'notice'>;

/** What the controller hands `moduleModeOf` besides its own deps and the view. */
export type ModuleModeHooks = {
  readonly modes: ModuleHookModes;
  /** Read per call: task mode is built after modules mode. */
  readonly tasks: () => ModuleHookTasks;
  readonly onExit: (to: ModuleExit) => void;
  /** Armed after each module draw, so the next frame is timed. */
  readonly frames: Pick<FrameClock, 'arm'>;
};

/**
 * Modules mode as the page controller holds it: what the state routing asks of it, the host's messages and the leave,
 * Re-layout and Retry (`relayout`), and the canvas events (`input`).
 */
export type PageModuleMode = {
  readonly isActive: () => boolean;
  readonly received: (state: GraphReady) => void;
  readonly enter: (packageName: string) => void;
  readonly leave: () => void;
  readonly receive: (message: GraphPackageModulesMessage | GraphShowModulesMessage) => void;
  /** Draws the saved view again with the camera kept; Shown only. */
  readonly relayout: () => void;
  readonly input: HandledModules;
};

/** What the module layout draws on and with. */
export type ModuleLayoutDeps = {
  readonly view: Pick<GraphView, 'modules' | 'viewport' | 'setViewport' | 'open' | 'fit'>;
  readonly runner: LayoutRunner;
  readonly measures: ModuleMeasures;
  readonly frames: Pick<FrameClock, 'arm'>;
  readonly showNotice: LayoutScreen['showNotice'];
  /** A draw that threw while still the one asked for last; the canvas is already empty. */
  readonly onFailure: (error: unknown) => void;
};

/** The module layout as the screen drives it (`GraphModuleLayout`). */
export type ModuleScreenLayout = {
  readonly draw: (found: ModulesFound, view: ModulesViewState, redraw: ModuleRedraw) => Promise<void>;
  /** The scene on screen; `null` before the first draw and after `clear`. */
  readonly scene: () => ModuleScene | null;
  readonly clear: () => void;
};

/** What the modules screen writes to: the page's root, mode buttons and modules bar, the layout and the canvas. */
export type ModuleScreenDeps = {
  readonly page: Pick<PageElements, 'root' | 'packagesMode' | 'taskMode' | 'modules'>;
  readonly layout: ModuleScreenLayout;
  readonly canvas: Pick<ModuleCanvas, 'clear'>;
};

/** Modules mode as the canvas input drives it (`GraphModuleMode`). */
export type ModuleInputMode = {
  readonly isActive: () => boolean;
  readonly phase: () => ModulePhase;
  readonly view: () => ModulesViewState | null;
  readonly update: (view: ModulesViewState, redraw: ModuleRedraw) => void;
  readonly enter: (packageName: string) => void;
  readonly saveCamera: () => void;
};

export type ModuleInputDeps = {
  readonly mode: ModuleInputMode;
  readonly canvas: ModuleCanvas;
  readonly bridge: Pick<Bridge, 'post'>;
};
