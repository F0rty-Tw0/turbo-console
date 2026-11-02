import type { GraphTask } from '../../bridge/common/graph-state.type.ts';

/**
 * What `shownSetOf` reads: the task pool, the chosen task ids, the dependent depth, whether the cap is lifted, and the ids
 * of the full listing, which tell a hidden script from an id that matches no task.
 */
export type ShownSetInput = {
  readonly tasks: GraphTask[];
  readonly chosen: string[];
  readonly depth: number;
  readonly capLifted: boolean;
  readonly listedIds: ReadonlySet<string>;
};

/** The task ids to draw (sorted), how many the cap cut, and the chosen ids the full listing lacks (sorted). */
export type ShownSet = {
  readonly ids: string[];
  readonly hiddenCount: number;
  readonly droppedIds: string[];
};
