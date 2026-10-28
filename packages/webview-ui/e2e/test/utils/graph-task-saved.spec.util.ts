import { savedWith } from './graph-saved-state.spec.util.ts';
import type { Position } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState, TaskViewState } from '../../../src/bridge/common/graph-view-state.type.ts';

const ORIGIN: Position = { x: 0, y: 0 };

/** A task view at its defaults (nothing chosen, depth 1, zoom 1, no layout key) with these fields replaced. */
export const taskViewOf = (overrides: Partial<TaskViewState>): TaskViewState => {
  const task: TaskViewState = {
    chosen: [],
    capLifted: false,
    depth: 1,
    selected: null,
    search: '',
    zoom: 1,
    pan: ORIGIN,
    fitted: false,
    layoutKey: '',
    ...overrides
  };

  return task;
};

/** A saved view of `hash` in task mode with `taskViewOf(task)`. */
export const taskSavedState = (hash: string, task: Partial<TaskViewState>): GraphViewState =>
  savedWith(hash, { mode: 'tasks', task: taskViewOf(task) });
