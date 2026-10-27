import type { FlowControl } from './flow.type.ts';
import type { FrameClock } from './frame-clock.type.ts';
import type { GraphInspectionDeps } from './graph-inspection.type.ts';
import type { LayoutScreen } from './graph-layouts.type.ts';
import type { GraphView, NodeSizer, PackageSaver } from './graph-page.type.ts';
import type { LayoutRunner } from './layout.type.ts';
import type { NodeSize } from './node-size.type.ts';
import type { TaskControls, TaskControlsActions } from './task-controls.type.ts';
import type { TaskDetails, TaskDetailsActions, TaskWidgets } from './task-details.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewMode, GraphViewState, TaskViewState } from '../../bridge/common/graph-view-state.type.ts';

/** The task Controls or Details open state, as task mode saves it. */
export type TaskPanelsOpen = Partial<Pick<GraphViewState, 'controlsOpen' | 'detailsOpen'>>;

/** What task mode reads and writes of `ViewStateModes`. */
export type TaskModes = {
  readonly mode: () => GraphViewMode;
  readonly task: () => TaskViewState | null;
  readonly current: () => GraphViewState | null;
  readonly setMode: (mode: GraphViewMode, hash: string) => void;
  readonly saveTask: (task: TaskViewState, hash: string) => void;
  /** Saves the task Controls or Details open state. */
  readonly savePanels: (panels: TaskPanelsOpen) => void;
};

/**
 * What the package side reads of `ViewStateModes`: its saver, the mode, which parks it in task mode, the state it redraws
 * with, and whether that state holds a grouping choice.
 */
export type PackageModes = {
  readonly packages: PackageSaver;
  readonly mode: () => GraphViewMode;
  readonly current: () => GraphViewState | null;
  readonly isGroupingSaved: () => boolean;
};

/** The package graph's way into task mode: Show tasks chooses every task of the package the host sent. */
export type PackageTasks = Pick<GraphInspectionDeps, 'onShowTasks' | 'hasTasks'>;

/** What the controller hands the package side besides its own deps and the view on screen. */
export type PackageSideHooks = {
  readonly frames: FrameClock;
  readonly modes: PackageModes;
  readonly tasks: PackageTasks;
  /** The page now shows a message instead of the graph: task mode shows its graph again with the next graph state. */
  readonly onMessage: () => void;
  /** A package layout was placed, after the package side's own folder pass; the layouts fit next, unless it was a first draw. */
  readonly onPlaced: () => void;
};

/** The canvas calls task mode makes: the task canvas, the camera and a re-measure after a panel change. */
export type TaskView = Pick<GraphView, 'tasks' | 'atoms' | 'fit' | 'setViewport' | 'viewport' | 'resize' | 'flowEdges'>;

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

/** The page-level task mode parts: the `task-mode` class, the pressed mode button, the prompt, the banner and the notice. */
export type TaskPanel = {
  readonly enter: () => void;
  /** Leaves package mode's look back: no class, Packages pressed, every task line hidden. */
  readonly exit: () => void;
  readonly show: (view: TaskPanelView) => void;
  /** Shows `text` in the notice line, or hides it for `null`; one shown in package mode hides after `PACKAGE_NOTICE_MS`. */
  readonly notice: (text: string | null) => void;
};

export type TaskPanelActions = {
  readonly onShowAll: () => void;
};

/** The two Details asides the Details bar moves between; the package one is built with the first package graph, so it may not exist yet. */
export type TaskPanelAsides = {
  readonly package: () => HTMLElement | null;
  readonly task: HTMLElement;
};

/** What the task layout and selection read of task mode's memory: the task view, the root label and a view save. */
export type TaskMemoryPort = {
  readonly view: () => TaskViewState;
  readonly rootLabel: () => string | null;
  readonly save: (edit: Partial<TaskViewState>) => void;
};

export type TaskModeDeps = {
  readonly view: TaskView;
  readonly runner: LayoutRunner;
  readonly sizeOf: NodeSizer;
  /** Sizes plain text, the umbrella counts line. */
  readonly textSizeOf: NodeSizer;
  readonly bridge: Bridge;
  readonly screen: LayoutScreen;
  readonly modes: TaskModes;
  readonly frames: Pick<FrameClock, 'start' | 'arm'>;
  /** Task mode was left: the controller shows the package graph again. */
  readonly onExit: () => void;
  /** A task layout threw: the page shows the reason, and the next graph state shows the task graph afresh. */
  readonly onFailure: (error: unknown) => void;
  /** Builds the task panel over the page, its Show all tasks wired to `actions`. */
  readonly panelOf: (actions: TaskPanelActions) => TaskPanel;
  /** Builds the task Controls over the page, its fields wired to `actions`. */
  readonly controlsOf: (actions: TaskControlsActions) => TaskControls;
  /** Builds the task side panel over the page, its dependency and Clear buttons wired to `actions`. */
  readonly detailsOf: (actions: TaskDetailsActions) => TaskDetails;
  /** Builds the selected task's "…" and its menu over the widget layer. */
  readonly widgetsOf: () => TaskWidgets;
  /** The flow overlay, stopped as a layout is placed or the task canvas empties. */
  readonly flow: Pick<FlowControl, 'stop'>;
  /** The clock, for the time a group toggle takes. */
  readonly now: () => number;
  /** After each task canvas paint and each placed task layout: tells the flow overlay how many task edges the painted target highlights. */
  readonly onHighlight: (litEdgeCount: number) => void;
};

/** What a task panel's open or close touches: the canvas, re-measured, and the saved open state. */
export type PanelToggleDeps = {
  readonly view: Pick<TaskView, 'resize'>;
  readonly modes: Pick<TaskModes, 'savePanels'>;
};

type SelectionClear = {
  readonly clear: () => void;
};

/** What Escape on the graph acts on in task mode: whether it is on, and its selection's clear. */
export type TaskKeyMode = {
  readonly isActive: () => boolean;
  readonly selection: SelectionClear;
};

/** What the controller hands `taskModeOf` besides its own deps and the view. */
export type TaskModeHooks = {
  readonly modes: TaskModes;
  readonly frames: FrameClock;
  readonly onExit: () => void;
  /** The page now shows a message instead of the graph, as `PackageSideHooks.onMessage`. */
  readonly onMessage: () => void;
  /** The controller-built flow overlay. */
  readonly flow: FlowControl;
};

/** The asked-for ids that match a task, once each in the order asked, and how many matched none. */
export type TaskChoice = {
  readonly chosen: string[];
  readonly dropped: number;
};

/** One task layout: the shown tasks, their ids, their layout key and the size of each umbrella among them. */
export type TaskLayoutRequest = {
  readonly tasks: GraphTask[];
  readonly shown: ReadonlySet<string>;
  readonly key: string;
  readonly sizes: ReadonlyMap<string, NodeSize>;
};

/** What `GraphTaskLayout` adds: the saved task view for its camera rule, and hooks after each placement. */
type TaskLayoutHooks = {
  readonly saved: () => TaskViewState | null;
  readonly rootLabel: () => string | null;
  readonly onPlaced: () => void;
  /** After `onPlaced`: the drawn layout's highlight goes back to the flow overlay the placement stopped. */
  readonly onDrawn: () => void;
};

export type TaskLayoutDeps = TaskModeDeps & TaskLayoutHooks;
