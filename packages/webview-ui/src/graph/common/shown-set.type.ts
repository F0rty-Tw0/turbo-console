import type { GraphTask } from '../../bridge/common/graph-state.type.ts';

/** What `shownSetOf` reads: the task list, the chosen task ids, the dependent depth and whether the cap is lifted. */
export type ShownSetInput = {
  readonly tasks: GraphTask[];
  readonly chosen: string[];
  readonly depth: number;
  readonly capLifted: boolean;
};

/** The task ids to draw (sorted), how many the cap cut, and the chosen ids that match no task (sorted). */
export type ShownSet = {
  readonly ids: string[];
  readonly hiddenCount: number;
  readonly droppedIds: string[];
};
