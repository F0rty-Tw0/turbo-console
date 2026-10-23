import { layoutScreenOf } from './graph-page-states.ts';
import { GraphTaskControls } from './graph-task-controls.ts';
import { GraphTaskDetails } from './graph-task-details.ts';
import { GraphTaskMode } from './graph-task-mode.ts';
import { saveDetailsToggle, taskPanelOf } from './graph-task-panel.ts';
import { GraphTaskWidgets } from './graph-task-widgets.ts';
import type { GraphControllerDeps, GraphView } from '../common/graph-page.type.ts';
import type { PackageTasks, TaskModeDeps, TaskModeHooks, TaskPanel, TaskPanelActions } from '../common/graph-task.type.ts';
import type { TaskControls, TaskControlsActions } from '../common/task-controls.type.ts';
import type { TaskDetails, TaskDetailsActions, TaskWidgets } from '../common/task-details.type.ts';

/** Task mode over the real view (never the parked one) and the runner the package graph shares; the Task mode toggle flips it. */
export const taskModeOf = (deps: GraphControllerDeps, view: GraphView, hooks: TaskModeHooks): GraphTaskMode => {
  const { runner, sizeOf, bridge, page, taskViews, taskDetailsViews, widgetViews, overlay } = deps;
  const panelOf = (actions: TaskPanelActions): TaskPanel => taskPanelOf(page, actions);
  const controlsOf = (actions: TaskControlsActions): TaskControls => new GraphTaskControls({ page, views: taskViews, actions });
  const isActive = (): boolean => hooks.modes.mode() === 'tasks';
  const aside = taskDetailsViews.panel();
  const widgets = new GraphTaskWidgets({ page, view, views: widgetViews, bridge, isActive, overlay, aside: (): HTMLElement => aside });
  const onToggle = (detailsOpen: boolean): void => saveDetailsToggle({ view, modes: hooks.modes }, widgets, detailsOpen);
  const views = { ...taskDetailsViews, panel: (): HTMLElement => aside };
  const detailsOf = (actions: TaskDetailsActions): TaskDetails => new GraphTaskDetails({ page, views, bridge, actions, onToggle });
  const widgetsOf = (): TaskWidgets => widgets;
  const screen = layoutScreenOf(page);
  const taskDeps: TaskModeDeps = { ...hooks, view, runner, sizeOf, bridge, screen, panelOf, controlsOf, detailsOf, widgetsOf };
  const mode = new GraphTaskMode(taskDeps);

  page.taskMode.addEventListener('click', (): void => mode.toggle(deps.now()));

  return mode;
};

/** Show tasks from the package graph: task mode on every task of the package, offered only for a package with one. */
export const packageTasksOf = (mode: () => GraphTaskMode, now: () => number): PackageTasks => {
  const onShowTasks = (name: string): void => {
    const taskIds = mode().packageTaskIds(name);

    mode().showTasks(taskIds, now());
  };
  const hasTasks = (name: string): boolean => {
    const taskIds = mode().packageTaskIds(name);

    return taskIds.length > 0;
  };
  const tasks: PackageTasks = { onShowTasks, hasTasks };

  return tasks;
};
