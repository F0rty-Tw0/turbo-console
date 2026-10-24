import type { NodeSize } from './node-size.type.ts';
import type { TaskRuns } from './task-details.type.ts';
import type { GraphTask, Positions } from '../../bridge/common/graph-state.type.ts';

/** What task mode draws: the shown tasks, their centres and the node sizer for their names. */
export type TaskDrawing = {
  readonly tasks: GraphTask[];
  readonly positions: Positions;
  readonly sizeOf: (name: string) => NodeSize;
};

/** The task graph on the one Cytoscape core: package compounds `pkg:<name>` holding `task` nodes, links task to dependency. */
export type TaskCanvas = {
  /** Removes every element, package graph included, then draws the tasks. */
  readonly show: (drawing: TaskDrawing) => void;
  readonly clear: () => void;
  /** Moves the task nodes only; a compound follows its tasks. */
  readonly setPositions: (positions: Positions) => void;
  /** The task nodes' centres. */
  readonly positions: () => Positions;
  /** Paints `target` selected and its closure highlighted, the rest dimmed; `null` paints every task normal. */
  readonly paint: (target: string | null) => void;
  /** Replaces every task's `run-<state>` class with the one `runs` names. */
  readonly runStates: (runs: TaskRuns) => void;
};
