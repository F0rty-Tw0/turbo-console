import type { DetailsElements } from './details-view.type.ts';
import type { GraphView, PageElements } from './graph-page.type.ts';
import type { WidgetViews } from './widget.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';

/** The latest host `runs` map: each task's run state by id; a task missing from it has no state. */
export type TaskRuns = Readonly<Record<string, GraphRunState>>;

/** What the task details panel shows of the selected task. */
export type TaskDetailsModel = {
  readonly task: GraphTask;
  readonly state: GraphRunState | null;
  /** The task's direct dependencies that are in the shown set, in its dependency order. */
  readonly dependencies: GraphTask[];
  /** The shown tasks that directly depend on the task, in the shown order. */
  readonly dependents: GraphTask[];
  /** The label a single-package root's owner line prints in place of `//`; `null` prints the package name. */
  readonly rootLabel: string | null;
};

/** The panel's three run buttons. */
export type TaskRunAction = 'run' | 'runNoCache' | 'stop';

export type TaskDependencyButton = {
  readonly task: GraphTask;
  readonly button: HTMLButtonElement;
};

/** One built view of the selected task; each button carries `data-focus`, so a rebuild can focus its twin. */
export type TaskDetailsView = {
  readonly root: HTMLElement;
  readonly heading: HTMLElement;
  readonly command: HTMLElement;
  /** The run state as icon + word, hidden while the task has no state. */
  readonly state: HTMLElement;
  readonly dependencies: TaskDependencyButton[];
  readonly dependents: TaskDependencyButton[];
  /** Shows the task's package in the package graph; `null` for a root task, whose package the graph never draws. */
  readonly owner: HTMLButtonElement | null;
  readonly run: HTMLButtonElement;
  readonly runNoCache: HTMLButtonElement;
  readonly stop: HTMLButtonElement;
};

/** What the panel shows while no task is selected; its heading takes focus when Clear selection had it. */
export type TaskDetailsEmpty = {
  readonly root: HTMLElement;
  readonly heading: HTMLElement;
};

export type TaskDetailsViews = {
  /** The hidden `aside#graph-task-details` and its empty `div.details-content`, which holds the panel's shown view. */
  readonly panel: () => DetailsElements;
  readonly empty: () => TaskDetailsEmpty;
  readonly view: (model: TaskDetailsModel) => TaskDetailsView;
};

export type TaskDetailsActions = {
  readonly onSelect: (id: string) => void;
  readonly onClear: () => void;
};

/** The task side panel, which task mode shows while it is on. */
export type TaskDetails = {
  /** Mounts the panel once, opens it as `isOpen` says and points the Details button at it. */
  readonly enter: (isOpen: boolean) => void;
  readonly exit: () => void;
  /** Shows the selected task, or an empty panel for `null`. */
  readonly show: (model: TaskDetailsModel | null) => void;
};

export type TaskDetailsDeps = {
  readonly page: Pick<PageElements, 'body' | 'details' | 'clear' | 'detailsBar' | 'packagesMode' | 'modeGroup' | 'controls'>;
  readonly views: TaskDetailsViews;
  readonly bridge: Bridge;
  readonly actions: TaskDetailsActions;
  /** The panel was opened or closed: the canvas re-measures and the open state is saved. */
  readonly onToggle: (isOpen: boolean) => void;
  /** The owner button was clicked: the package graph shows package `name`. */
  readonly onShowPackage: (name: string) => void;
};

/** What the task "…" menu's items call: the panel's run button `action` for the task `id`. */
export type TaskMenuActions = {
  readonly act: (id: string, action: TaskRunAction) => void;
};

/** The selected task's "…" over the canvas and the menu it opens, which task mode shows while it is on. */
export type TaskWidgets = {
  /** The "…" beside the selected task of `model`; none for `null`, outside task mode, or while its menu would be empty. */
  readonly show: (model: TaskDetailsModel | null) => void;
  /** After a frame: the "…" follows its task, and a camera move closes the menu. */
  readonly rendered: () => void;
  /** Task mode ends: the menu closes and the "…" goes. */
  readonly exit: () => void;
  /** The reader selected a task or opened the panel: the task and its "…" pan clear of the panel overlaying the canvas. */
  readonly keepClear: () => void;
};

export type TaskWidgetsDeps = {
  readonly page: PageElements;
  readonly view: Pick<GraphView, 'widgetRects' | 'viewport' | 'anchorBox' | 'panBy'>;
  readonly views: Pick<WidgetViews, 'packageButton' | 'menu'>;
  readonly bridge: Bridge;
  /** Task mode is on, so the "…" may open its menu. */
  readonly isActive: () => boolean;
  /** `window.matchMedia(OVERLAY_MEDIA_QUERY)`: while it matches, the task details panel overlays the canvas. */
  readonly overlay: MediaQueryList;
  /** The task details panel; the "…" and its menu stay left of it while it overlays the canvas. */
  readonly aside: () => HTMLElement;
};

/** What `GraphTaskSelection` paints on, builds the panel and the "…" with, and reads and saves the task view through. */
export type TaskSelectionDeps = {
  readonly view: Pick<GraphView, 'tasks' | 'flowEdges'>;
  /** After each canvas paint: how many edges the painted target highlights, `0` for none. */
  readonly onHighlight: (litEdgeCount: number) => void;
  readonly detailsOf: (actions: TaskDetailsActions) => TaskDetails;
  readonly widgetsOf: () => TaskWidgets;
  readonly task: () => TaskViewState;
  readonly rootLabel: () => string | null;
  readonly save: (edit: Partial<TaskViewState>) => void;
};
