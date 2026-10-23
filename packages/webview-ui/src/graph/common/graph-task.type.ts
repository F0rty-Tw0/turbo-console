import type { FrameClock } from './frame-clock.type.ts';
import type { LayoutScreen } from './graph-layouts.type.ts';
import type { GraphView, NodeSizer, PackageSaver } from './graph-page.type.ts';
import type { LayoutRunner } from './layout.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewMode, TaskViewState } from '../../bridge/common/graph-view-state.type.ts';

/** What task mode reads and writes of `ViewStateModes`. */
export type TaskModes = {
  readonly mode: () => GraphViewMode;
  readonly task: () => TaskViewState | null;
  readonly saveTask: (task: TaskViewState, hash: string) => void;
};

/** What the package side reads of `ViewStateModes`: its saver and the mode, which parks it in task mode. */
export type PackageModes = {
  readonly packages: PackageSaver;
  readonly mode: () => GraphViewMode;
};

/** The canvas calls task mode makes: the task canvas and the camera. */
export type TaskView = Pick<GraphView, 'tasks' | 'fit' | 'setViewport' | 'viewport'>;

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
};

/** What the controller hands `taskModeOf` besides its own deps and the view. */
export type TaskModeHooks = {
  readonly modes: TaskModes;
  readonly frames: FrameClock;
  readonly onExit: () => void;
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
