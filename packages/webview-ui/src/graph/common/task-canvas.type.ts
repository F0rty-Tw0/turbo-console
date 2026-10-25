import type { AtomBoxSpec } from './atom-layout.type.ts';
import type { NodeSize } from './node-size.type.ts';
import type { TaskRuns } from './task-details.type.ts';
import type { GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomFile, GraphTask, Positions } from '../../bridge/common/graph-state.type.ts';

/**
 * What task mode draws: the shown tasks, their centres, the node sizer for their names, the size of each umbrella that
 * has one of its own, and the label of each umbrella that has a counts line.
 */
export type TaskDrawing = {
  readonly tasks: GraphTask[];
  readonly positions: Positions;
  readonly sizeOf: (name: string) => NodeSize;
  readonly sizes: ReadonlyMap<string, NodeSize>;
  readonly labels: ReadonlyMap<string, string>;
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
  /** Sets the label of each umbrella in `labels` to its name and counts line; a task not drawn is skipped, no node moves. */
  readonly setCounts: (labels: ReadonlyMap<string, string>) => void;
  /** Marks the tasks and the Atomizer file nodes again with the kept runs map and paints the kept target again; an expand adds nodes the last mark and paint never saw. */
  readonly remark: () => void;
};

/**
 * The Atomizer groups on the task canvas: an expanded group is the box `atom:<umbrellaId>` inside the umbrella's package
 * box, holding the umbrella and a node per file. The groups' other rules (which are open, where nodes sit) are
 * `GraphAtomGroups`'s; a call for a group the canvas does not draw does nothing.
 */
export type AtomCanvas = {
  /** Opens `spec`'s box in package box `pkgBoxId`, moves the umbrella into it and adds a node per file, outlined by its outcome. */
  readonly expand: (spec: AtomBoxSpec, pkgBoxId: string, files: GraphAtomFile[], outcomes: Record<string, GraphAtomOutcome>) => void;
  /** Moves the umbrella back into `pkgBoxId` and removes its files and box. */
  readonly collapse: (umbrellaId: string, pkgBoxId: string) => void;
  /** Moves each drawn node in `positions` to its centre; an id not drawn is skipped. */
  readonly setPositions: (positions: Positions) => void;
  /** Gives each drawn file in `outcomes` the class of its outcome in place of the one it had. */
  readonly setOutcomes: (outcomes: Record<string, GraphAtomOutcome>) => void;
  /** Whether the canvas lets the user drag nodes: it does not while any group is expanded. */
  readonly setGrabbable: (isGrabbable: boolean) => void;
};
