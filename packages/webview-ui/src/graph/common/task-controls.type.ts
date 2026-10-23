import type { PageElements } from './graph-page.type.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';

/** The task mode Controls panel `aside#graph-task-controls`, unwired: Search tasks, Dependents depth and the task list. */
export type TaskControlsElements = {
  readonly panel: HTMLElement;
  readonly search: HTMLInputElement;
  readonly depth: HTMLInputElement;
  /** The `grid` of task rows; one Tab stop with a roving focus. */
  readonly list: HTMLElement;
};

/** One task list row: its line and its button, which reads the task name, then the package as a description. */
export type TaskControlsRow = {
  readonly task: GraphTask;
  readonly line: HTMLElement;
  readonly pick: HTMLButtonElement;
};

/** The task Controls builders, handed in because `domain-logic` may not import `ui`. */
export type TaskControlsViews = {
  readonly build: () => TaskControlsElements;
  readonly row: (task: GraphTask) => TaskControlsRow;
};

/** What the task Controls report: a new search text, a valid Dependents depth, a picked row and a panel opened or closed. */
export type TaskControlsActions = {
  readonly onSearch: (search: string) => void;
  readonly onDepth: (depth: number) => void;
  readonly onPick: (id: string) => void;
  readonly onToggle: (isOpen: boolean) => void;
};

/** The task Controls panel while task mode is on: it replaces the package Controls panel and follows the Controls button. */
export type TaskControls = {
  /** Shows the panel, open when `isOpen`, with the task view's search and depth. */
  readonly enter: (task: TaskViewState, isOpen: boolean) => void;
  readonly exit: () => void;
  /** Lists the shown tasks; the search narrows the rows only. */
  readonly setRows: (tasks: GraphTask[]) => void;
};

/** What `GraphTaskControls` builds its panel with and reports to. */
export type TaskControlsDeps = {
  readonly page: Pick<PageElements, 'body' | 'controls' | 'taskMode'>;
  readonly views: TaskControlsViews;
  readonly actions: TaskControlsActions;
};
