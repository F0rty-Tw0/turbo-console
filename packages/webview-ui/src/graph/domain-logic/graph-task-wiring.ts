import { layoutScreenOf } from './graph-page-states.ts';
import { GraphTaskControls } from './graph-task-controls.ts';
import { GraphTaskMode } from './graph-task-mode.ts';
import { taskPanelOf } from './graph-task-panel.ts';
import type { GraphControllerDeps, GraphView } from '../common/graph-page.type.ts';
import type { TaskModeDeps, TaskModeHooks, TaskPanel, TaskPanelActions } from '../common/graph-task.type.ts';
import type { TaskControls, TaskControlsActions } from '../common/task-controls.type.ts';

/** Task mode over the real view (never the parked one) and the runner the package graph shares; the Task mode toggle flips it. */
export const taskModeOf = (deps: GraphControllerDeps, view: GraphView, hooks: TaskModeHooks): GraphTaskMode => {
  const { runner, sizeOf, bridge, page, taskViews } = deps;
  const panelOf = (actions: TaskPanelActions): TaskPanel => taskPanelOf(page, actions);
  const controlsOf = (actions: TaskControlsActions): TaskControls => new GraphTaskControls({ page, views: taskViews, actions });
  const taskDeps: TaskModeDeps = { ...hooks, view, runner, sizeOf, bridge, screen: layoutScreenOf(page), panelOf, controlsOf };
  const mode = new GraphTaskMode(taskDeps);

  page.taskMode.addEventListener('click', (): void => mode.toggle(deps.now()));

  return mode;
};
