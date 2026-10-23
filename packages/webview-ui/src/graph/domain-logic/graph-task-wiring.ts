import { layoutScreenOf } from './graph-page-states.ts';
import { GraphTaskMode } from './graph-task-mode.ts';
import type { GraphControllerDeps, GraphView } from '../common/graph-page.type.ts';
import type { TaskModeDeps, TaskModeHooks } from '../common/graph-task.type.ts';

/** Task mode over the real view (never the parked one) and the runner the package graph shares. */
export const taskModeOf = (deps: GraphControllerDeps, view: GraphView, hooks: TaskModeHooks): GraphTaskMode => {
  const { runner, sizeOf, bridge, page } = deps;
  const taskDeps: TaskModeDeps = { ...hooks, view, runner, sizeOf, bridge, screen: layoutScreenOf(page) };

  return new GraphTaskMode(taskDeps);
};
