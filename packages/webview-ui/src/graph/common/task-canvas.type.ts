import type { AtomChipBox } from './atom-chips.type.ts';
import type { AtomDrawSpec } from './atom-layout.type.ts';
import type { TaskNaming } from './graph-task.type.ts';
import type { BoxFrames } from './layout.type.ts';
import type { NodeSize } from './node-size.type.ts';
import type { TaskRuns } from './task-details.type.ts';
import type { GraphAffectedMark } from '../../bridge/common/graph-affected.type.ts';
import type { GraphAtomCounts, GraphAtomOutcome } from '../../bridge/common/graph-atoms-message.type.ts';
import type { GraphPrediction } from '../../bridge/common/graph-message.type.ts';
import type { GraphTask, Positions } from '../../bridge/common/graph-state.type.ts';

/** The cache prediction word of each predicted task, by task id; a task not named has none. */
export type TaskPredictions = Readonly<Record<string, GraphPrediction>>;

/** The affected mark of each affected task, by task id; a task not named has none. */
export type TaskAffectedMarks = Readonly<Record<string, GraphAffectedMark>>;

/**
 * What task mode draws: the shown tasks, their centres, the frame of each titled-row box, the node sizer for their names,
 * the size of each umbrella that has one of its own, the counts of each umbrella, and the
 * title text width of each package.
 */
export type TaskDrawing = {
  readonly tasks: GraphTask[];
  readonly positions: Positions;
  /** The ELK frame of each titled-row box, by box id; a box with none draws as any package box. */
  readonly boxFrames: BoxFrames;
  readonly sizeOf: (name: string) => NodeSize;
  readonly sizes: ReadonlyMap<string, NodeSize>;
  readonly counts: ReadonlyMap<string, GraphAtomCounts>;
  /**
   * The width each box title needs to draw whole, which its box is at least as wide as: by package name for a package
   * box, by `scripts:<name>` for a Scripts box.
   */
  readonly titleWidths: ReadonlyMap<string, number>;
  /** The label a single-package root's box is titled with in place of `//`; `null` titles it with the package name. */
  readonly rootLabel: string | null;
  /** Whether package boxes sit in folder boxes, and each package's label and folder. */
  readonly naming: TaskNaming;
};

/**
 * The task graph on the one Cytoscape core: package compounds `pkg:<name>` holding turbo `task` nodes and, when a script
 * is drawn, a Scripts compound `scripts:<name>` holding the script `task` nodes; links task to dependency, each one straight
 * line whatever bends ELK routed it on.
 */
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
  /**
   * Replaces every task's `predict-<word>` class with the one the record names; kept, so a task graph drawn again carries it.
   * The record it already holds is skipped, and so is `null` (a runs message without `predictions`: they did not change), so
   * the marks stay. Box frames are refit only when a class changed.
   */
  readonly predictions: (next: TaskPredictions | null) => void;
  /**
   * Replaces every task's `affected-<mark>` class with the one the record names, own keys only; kept, so a task graph drawn
   * again carries it. The record it already holds is skipped. Box frames are not refit: Cytoscape leaves an underlay out
   * of a node's body bounds, which a compound's size and a box frame are measured from, so a halo moves no box.
   */
  readonly affected: (next: TaskAffectedMarks) => void;
  /** Sets the `countsText` of each umbrella in `counts` from its counts, its label staying its name; a task not drawn is skipped, no node moves. */
  readonly setCounts: (counts: ReadonlyMap<string, GraphAtomCounts>) => void;
  /** Marks the tasks and the Atomizer file nodes again with the kept runs map, predictions and affected marks and paints the kept target again; an expand adds nodes the last mark and paint never saw. */
  readonly remark: () => void;
};

/**
 * The Atomizer groups on the task canvas: an expanded group is the box `atom:<umbrellaId>` inside the umbrella's package
 * box, holding the umbrella, a node per drawn file and a count node for the files not drawn. The groups' other rules (which
 * are open, where nodes sit) are `GraphAtomGroups`'s; a call for a group the canvas does not draw does nothing.
 */
export type AtomCanvas = {
  /**
   * Opens `spec`'s box in package box `pkgBoxId`, moves the umbrella into it and adds a node for each of its drawn files whose
   * id is free, outlined by its outcome, and a count node when files are hidden. Whether it drew, since nothing is drawn if the
   * umbrella is not drawn or the box's id is taken. A framed package box drops `box-framed` while open, keeping its frame data.
   */
  readonly expand: (spec: AtomDrawSpec, pkgBoxId: string, outcomes: Record<string, GraphAtomOutcome>) => boolean;
  /**
   * Moves the umbrella back into `pkgBoxId` and removes its files and box, putting `box-framed` back on a package box that
   * carries a frame; a node of the box's id that is not a box stays.
   */
  readonly collapse: (umbrellaId: string, pkgBoxId: string) => void;
  /** Moves each drawn node in `positions` to its centre; an id not drawn is skipped. */
  readonly setPositions: (positions: Positions) => void;
  /**
   * Starts each drawn link in `ends`, by edge id, at its source end offset (`0px 100px`, from its source's centre), or at
   * its source's border for `null`; an id not drawn is skipped.
   */
  readonly setLinkEnds: (ends: ReadonlyMap<string, string | null>) => void;
  /** Gives each drawn file in `outcomes` the class of its outcome in place of the one it had. */
  readonly setOutcomes: (outcomes: Record<string, GraphAtomOutcome>) => void;
  /** Whether the canvas lets the user drag nodes: it does not while any group is expanded. */
  readonly setGrabbable: (isGrabbable: boolean) => void;
  /** Whether `id` is a box or file this canvas drew; a task that merely shares the id of one is not. */
  readonly isAtomNode: (id: string) => boolean;
  /** The model centre and width of the drawn node `id`, which a chip row is placed over; `null` when it is not drawn. */
  readonly boxOf: (id: string) => AtomChipBox | null;
};
