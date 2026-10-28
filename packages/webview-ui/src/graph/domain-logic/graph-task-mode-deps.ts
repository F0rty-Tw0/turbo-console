import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { UmbrellaSizers } from '../common/graph-page.type.ts';
import type { TaskLayoutDeps, TaskMemoryPort, TaskModeDeps } from '../common/graph-task.type.ts';
import type { TaskSelectionDeps } from '../common/task-details.type.ts';

type LayoutHooks = Pick<TaskLayoutDeps, 'onPlaced' | 'onDrawn'>;

/** What `GraphTaskLayout` is built with: the mode's deps, the saved task view and root label from `memory`, and `hooks`. */
export const layoutDepsOf = (deps: TaskModeDeps, memory: TaskMemoryPort, hooks: LayoutHooks): TaskLayoutDeps => {
  const layoutDeps: TaskLayoutDeps = {
    ...deps,
    saved: (): TaskViewState | null => deps.modes.task(),
    rootLabel: (): string | null => memory.rootLabel(),
    ...hooks
  };

  return layoutDeps;
};

/** What `GraphTaskSelection` is built with: the mode's deps, and the task view, root label and saves of `memory`. */
export const selectionDepsOf = (deps: TaskModeDeps, memory: TaskMemoryPort): TaskSelectionDeps => {
  const selectionDeps: TaskSelectionDeps = {
    ...deps,
    task: (): TaskViewState => memory.view(),
    rootLabel: (): string | null => memory.rootLabel(),
    save: (edit: Partial<TaskViewState>): void => memory.save(edit)
  };

  return selectionDeps;
};

/** How task mode measures an umbrella's name and file counts. */
export const umbrellaSizersOf = (deps: TaskModeDeps): UmbrellaSizers => {
  const sizers: UmbrellaSizers = { name: deps.sizeOf, counts: deps.textSizeOf };

  return sizers;
};
