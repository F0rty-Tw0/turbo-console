import type { FrameClock } from './frame-clock.type.ts';
import type { LayoutScreen } from './graph-layouts.type.ts';
import type { GraphView, NodeSizer, PackageSaver } from './graph-page.type.ts';
import type { LayoutRunner } from './layout.type.ts';
import type { TaskControls, TaskControlsActions } from './task-controls.type.ts';
import type { TaskDetails, TaskDetailsActions } from './task-details.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewMode, GraphViewState, TaskViewState } from '../../bridge/common/graph-view-state.type.ts';

/** What task mode reads and writes of `ViewStateModes`. */
export type TaskModes = {
  readonly mode: () => GraphViewMode;
  readonly task: () => TaskViewState | null;
  readonly current: () => GraphViewState | null;
  readonly setMode: (mode: GraphViewMode, hash: string) => void;
  readonly saveTask: (task: TaskViewState, hash: string) => void;
  /** Saves the task Controls or Details open state. */
  readonly savePanels: (panels: Partial<Pick<GraphViewState, 'controlsOpen' | 'detailsOpen'>>) => void;
};

/** What the package side reads of `ViewStateModes`: its saver, the mode, which parks it in task mode, and the state it redraws with. */
export type PackageModes = {
  readonly packages: PackageSaver;
  readonly mode: () => GraphViewMode;
  readonly current: () => GraphViewState | null;
};

/** The canvas calls task mode makes: the task canvas, the camera and a re-measure after a panel change. */
export type TaskView = Pick<GraphView, 'tasks' | 'fit' | 'setViewport' | 'viewport' | 'resize'>;

/** The task mode lines above the canvas, built once by `buildPage`, all hidden in package mode. */
export type TaskScreenElements = {
  /** `EMPTY_TASKS_TEXT`, shown while nothing is chosen. */
  readonly prompt: HTMLElement;
  /** The cap banner: `bannerText` and the Show all tasks button. */
  readonly banner: HTMLElement;
  readonly bannerText: HTMLElement;
  readonly showAll: HTMLButtonElement;
  /** A dropped-ids or unknown-ids notice. */
  readonly notice: HTMLElement;
};

/** What the task panel shows: the prompt while nothing is shown, and the banner while the cap hides tasks. */
export type TaskPanelView = {
  readonly isEmpty: boolean;
  readonly hiddenCount: number;
};

/** The page-level task mode parts: the `task-mode` class, the pressed toggle, the prompt, the banner and the notice. */
export type TaskPanel = {
  readonly enter: () => void;
  /** Leaves package mode's look back: no class, the toggle unpressed, every task line hidden. */
  readonly exit: () => void;
  readonly show: (view: TaskPanelView) => void;
  /** Shows `text` in the notice line, or hides it for `null`. */
  readonly notice: (text: string | null) => void;
};

export type TaskPanelActions = {
  readonly onShowAll: () => void;
};

export type TaskModeDeps = {
  readonly view: TaskView;
  readonly runner: LayoutRunner;
  readonly sizeOf: NodeSizer;
  readonly bridge: Bridge;
  readonly screen: LayoutScreen;
  readonly modes: TaskModes;
  readonly frames: Pick<FrameClock, 'start' | 'arm'>;
  /** Task mode was left: the controller shows the package graph again. */
  readonly onExit: () => void;
  /** Builds the task panel over the page, its Show all tasks wired to `actions`. */
  readonly panelOf: (actions: TaskPanelActions) => TaskPanel;
  /** Builds the task Controls over the page, its fields wired to `actions`. */
  readonly controlsOf: (actions: TaskControlsActions) => TaskControls;
  /** Builds the task side panel over the page, its dependency and Clear buttons wired to `actions`. */
  readonly detailsOf: (actions: TaskDetailsActions) => TaskDetails;
};

/** What the controller hands `taskModeOf` besides its own deps and the view. */
export type TaskModeHooks = {
  readonly modes: TaskModes;
  readonly frames: FrameClock;
  readonly onExit: () => void;
};

/** The asked-for ids that match a task, once each in the order asked, and how many matched none. */
export type TaskChoice = {
  readonly chosen: string[];
  readonly dropped: number;
};

/** One task layout: the shown tasks, their ids and their layout key. */
export type TaskLayoutRequest = {
  readonly tasks: GraphTask[];
  readonly shown: ReadonlySet<string>;
  readonly key: string;
};

/** What `GraphTaskLayout` adds: the saved task view for its camera rule, and a hook after each placement. */
type TaskLayoutHooks = {
  readonly saved: () => TaskViewState | null;
  readonly onPlaced: () => void;
};

export type TaskLayoutDeps = TaskModeDeps & TaskLayoutHooks;
