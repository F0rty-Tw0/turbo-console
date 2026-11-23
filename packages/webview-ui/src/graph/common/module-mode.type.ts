import type { FrameClock } from './frame-clock.type.ts';
import type { LayoutScreen } from './graph-layouts.type.ts';
import type { GraphView, Viewport } from './graph-page.type.ts';
import type { TaskModes } from './graph-task.type.ts';
import type { LayoutRunner } from './layout.type.ts';
import type { HandledModules, ModuleCanvas } from './module-canvas.type.ts';
import type { ModulePanelHooks } from './module-panels.type.ts';
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
  /** Failed with the old graph kept: draws `view` again placed by `redraw`, leaving the bar and its failed banner as they are. */
  readonly drawAgain: (found: ModulesFound, view: ModulesViewState, redraw: ModuleRedraw) => void;
  /** A module draw has landed and is on screen; false before the first one lands and after the canvas is cleared. */
  readonly isDrawn: () => boolean;
  /**
   * Keeps the old graph drawn, if any, and shows "Could not scan <P>." with Retry; with none, the status is emptied and a
   * draw still in flight is dropped.
   */
  readonly failed: (name: string) => void;
  /** Failed after a host message: the graph view shows again over whatever canvas was kept. */
  readonly reshow: () => void;
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
  /** Started at a found scan's receive time, so the module draw's first frame is timed from the host's reply. */
  readonly frames: Pick<FrameClock, 'start'>;
  /** Every saved modules view, so the panels read it (spec §6.5). */
  readonly onView: (view: ModulesViewState) => void;
  readonly panels: ModulePanelHooks;
  /** A found scan, before its view is read, so what it no longer holds is dropped from the saved view first (spec §6.5). */
  readonly onFound: (found: ModulesFound) => void;
};

/**
 * `ModuleModes` plus the mode, which tells `resumeModules` a reload left the page in modules mode, and the saved state and
 * panel save the module Controls open state is read from and saved to (spec §6.8).
 */
export type ModuleHookModes = ModuleModes & Pick<TaskModes, 'mode' | 'current' | 'savePanels'>;

/** Task mode as the module wiring reaches it: the side modules mode parks, and the notice line it writes "P gone" to. */
type ModuleHookTasks = ModuleTaskSide & Pick<PageTaskMode, 'notice'>;

/** What the controller hands `moduleModeOf` besides its own deps and the view. */
export type ModuleModeHooks = {
  readonly modes: ModuleHookModes;
  /** Read per call: task mode is built after modules mode. */
  readonly tasks: () => ModuleHookTasks;
  readonly onExit: (to: ModuleExit) => void;
  /** Started at a found scan's receive time and armed after each module draw, so the next frame is timed. */
  readonly frames: Pick<FrameClock, 'arm' | 'start'>;
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
  /** A host message received at `at`. */
  readonly receive: (message: GraphPackageModulesMessage | GraphShowModulesMessage, at: number) => void;
  /** A host message replaced the page; the next graph state still listing the package takes it back. */
  readonly suspend: () => void;
  /** Draws the saved view again with the camera kept; Shown, or Failed over a kept graph, only. */
  readonly relayout: () => void;
  readonly input: HandledModules;
};

/** What the module layout draws on and with. */
export type ModuleLayoutDeps = {
  readonly view: Pick<GraphView, 'modules' | 'viewport' | 'setViewport' | 'open' | 'fit'>;
  readonly runner: LayoutRunner;
  readonly measures: ModuleMeasures;
  readonly frames: Pick<FrameClock, 'arm'>;
  /** Each placed draw shows the graph view, so one that lands after a failure message takes the page back from it. */
  readonly showGraph: LayoutScreen['showGraph'];
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

/** What the modules screen writes to: the page's root, mode buttons and modules bar, the layout and the graph view. */
export type ModuleScreenDeps = {
  readonly page: Pick<PageElements, 'root' | 'packagesMode' | 'taskMode' | 'modules'>;
  readonly layout: ModuleScreenLayout;
  readonly showGraph: LayoutScreen['showGraph'];
  /** Each draw that landed with a scene on screen. */
  readonly onDrawn: (scene: ModuleScene) => void;
};

type ModuleRefresh = { readonly refresh: () => void };

/** Modules mode as the modules bar drives it (`GraphModuleMode`): Back, Refresh and Retry, and the root entry. */
export type ModuleBarMode = Pick<PageModuleMode, 'enter' | 'leave'> & ModuleRefresh;

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
  /** The graph container a canvas tap hands focus back to, as Cytoscape blurs it on every press. */
  readonly container: Pick<HTMLElement, 'focus'>;
  readonly bridge: Pick<Bridge, 'post'>;
};
