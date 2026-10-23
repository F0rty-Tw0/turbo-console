import type { GraphView, PageElements } from './graph-page.type.ts';
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
  readonly run: HTMLButtonElement;
  readonly runNoCache: HTMLButtonElement;
  readonly stop: HTMLButtonElement;
};

export type TaskDetailsViews = {
  /** The empty, hidden `aside#graph-task-details`. */
  readonly panel: () => HTMLElement;
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
  readonly page: Pick<PageElements, 'body' | 'details' | 'clear' | 'taskMode'>;
  readonly views: TaskDetailsViews;
  readonly bridge: Bridge;
  readonly actions: TaskDetailsActions;
  /** The panel was opened or closed: the canvas re-measures and the open state is saved. */
  readonly onToggle: (isOpen: boolean) => void;
};

/** What `GraphTaskSelection` paints on, builds the panel with, and reads and saves the task view through. */
export type TaskSelectionDeps = {
  readonly view: Pick<GraphView, 'tasks'>;
  readonly detailsOf: (actions: TaskDetailsActions) => TaskDetails;
  readonly task: () => TaskViewState;
  readonly save: (edit: Partial<TaskViewState>) => void;
};
