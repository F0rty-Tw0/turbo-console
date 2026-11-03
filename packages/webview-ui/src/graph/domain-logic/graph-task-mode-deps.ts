import { savePanelToggle } from './graph-task-panel.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { UmbrellaSizers } from '../common/graph-page.type.ts';
import type { TaskLayoutDeps, TaskMemoryPort, TaskModeDeps, UmbrellaFacts } from '../common/graph-task.type.ts';
import type { ControlsEdits, TaskControlsActions } from '../common/task-controls.type.ts';
import type { TaskSelectionDeps } from '../common/task-details.type.ts';

type LayoutHooks = Pick<TaskLayoutDeps, 'onPlaced' | 'onDrawn'>;

/** What `umbrellaFactsOf` reads of the Atomizer groups: each umbrella's file count by task id. */
type AtomCounts = {
  readonly fileCounts: () => ReadonlyMap<string, number>;
};

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

/** How task mode sizes the shown umbrellas: the file counts `atoms` holds, and its name and counts sizers. */
export const umbrellaFactsOf = (deps: TaskModeDeps, atoms: AtomCounts): UmbrellaFacts => {
  const sizers: UmbrellaSizers = { name: deps.sizeOf, counts: deps.textSizeOf };
  const facts: UmbrellaFacts = { fileCounts: atoms.fileCounts(), sizers };

  return facts;
};

/**
 * What the task Controls report and what task mode does with it: the search is saved, a depth or a pick goes through
 * `edits`, the open state is saved with the canvas re-measured, Group by folder is saved and drawn, and a View toggle goes
 * to the host, whose next state redraws.
 */
export const controlsActionsOf = (deps: TaskModeDeps, memory: TaskMemoryPort, edits: ControlsEdits): TaskControlsActions => {
  const actions: TaskControlsActions = {
    onSearch: (search: string): void => memory.save({ search }),
    onDepth: (depth: number): void => edits.choose({ depth }),
    onPick: (id: string): void => edits.select(id),
    onToggle: (controlsOpen: boolean): void => savePanelToggle(deps, { controlsOpen }),
    onGrouping: (isGrouped: boolean): void => {
      deps.modes.saveGrouped(isGrouped);
      edits.choose({});
    },
    onViewToggle: (toggle: 'scope' | 'scripts', shown: boolean): void => deps.bridge.post({ type: 'setViewToggle', toggle, shown })
  };

  return actions;
};
