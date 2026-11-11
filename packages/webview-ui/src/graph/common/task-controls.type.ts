import type { PageElements } from './page-elements.type.ts';
import type { ProjectLine, TaskGridFacts, TaskGridRow } from './task-grid.type.ts';
import type { GraphViewToggle } from '../../bridge/common/graph-message.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';

/**
 * The task mode Controls panel `aside#graph-task-controls`, unwired: the Search section, the View section (Dependents depth
 * and the five checkboxes) and the Projects grid.
 */
export type TaskControlsElements = {
  readonly panel: HTMLElement;
  readonly search: HTMLInputElement;
  readonly depth: HTMLInputElement;
  readonly grouping: HTMLInputElement;
  readonly scope: HTMLInputElement;
  readonly scripts: HTMLInputElement;
  /** Show cache prediction, after Show scripts; always shown in the panel. */
  readonly prediction: HTMLInputElement;
  /** Show affected, after Show cache prediction; always shown in the panel. */
  readonly affected: HTMLInputElement;
  /** The labels around Group by folder and Show scripts, which `hidden` removes from the panel and the page's roles. */
  readonly groupingField: HTMLElement;
  readonly scriptsField: HTMLElement;
  /** The `grid` of Projects rows; one Tab stop with a roving focus. */
  readonly list: HTMLElement;
};

/** The task Controls builders, handed in because `domain-logic` may not import `ui`. */
export type TaskControlsViews = {
  readonly build: () => TaskControlsElements;
  readonly line: (line: ProjectLine) => TaskGridRow;
};

/**
 * What the task Controls report: a new search text, a valid Dependents depth, a picked row, a project, folder or task check, a panel opened or closed, Group
 * by folder ticked or unticked and Show package scopes, Show scripts, Show cache prediction or Show affected ticked or unticked.
 */
export type TaskControlsActions = {
  readonly onSearch: (search: string) => void;
  readonly onDepth: (depth: number) => void;
  readonly onPick: (id: string) => void;
  readonly onCheck: (ids: string[], isChecked: boolean) => void;
  readonly onToggle: (isOpen: boolean) => void;
  readonly onGrouping: (isGrouped: boolean) => void;
  readonly onViewToggle: (toggle: GraphViewToggle, shown: boolean) => void;
};

/** What the task Controls edit in task mode: a new choice, depth or cap, saved and drawn, and a picked task id selected. */
export type ControlsEdits = {
  readonly choose: (edit: Partial<TaskViewState>) => void;
  readonly select: (id: string) => void;
};

/**
 * What the View boxes read: Group by folder ticked and whether it applies (a single package is never grouped), Show
 * package scopes and Show scripts ticked, whether the listing holds a script, which Show scripts needs to be shown, and Show
 * cache prediction and Show affected ticked.
 */
export type TaskViewChecks = {
  readonly grouped: boolean;
  readonly canGroup: boolean;
  readonly scopeShown: boolean;
  readonly scriptsShown: boolean;
  readonly hasScripts: boolean;
  readonly predictionShown: boolean;
  readonly affectedShown: boolean;
};

/** The task Controls panel while task mode is on: it replaces the package Controls panel and follows the Controls button. */
export type TaskControls = {
  /** Shows the panel, open when `isOpen`, with the task view's search and depth. */
  readonly enter: (task: TaskViewState, isOpen: boolean) => void;
  readonly exit: () => void;
  /** Sets the View boxes to `checks` without reporting it as a user choice. */
  readonly setView: (checks: TaskViewChecks) => void;
  /** Lists the pool as the Projects grid, a single-package root's owner printed as `facts.rootLabel`; the search narrows the grid only. */
  readonly setProjects: (facts: TaskGridFacts) => void;
};

/** What `GraphTaskControls` builds its panel with and reports to. */
export type TaskControlsDeps = {
  readonly page: Pick<PageElements, 'body' | 'controls' | 'packagesMode' | 'modeGroup'>;
  readonly views: TaskControlsViews;
  readonly actions: TaskControlsActions;
};
