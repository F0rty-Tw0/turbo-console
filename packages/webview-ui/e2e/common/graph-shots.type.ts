import type { GraphReady } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';

/** What a shot starts from: the uncached state, the view saved before its ELK pass, and the cache field that pass fills. */
export type ShotSetup = {
  readonly state: GraphReady;
  readonly saved: GraphViewState;
  readonly cache: 'positions' | 'folderPositions';
};

/** What a task shot starts from: the task state and the saved task view with its chosen task selected; tasks cache no positions. */
export type TaskShotSetup = {
  readonly state: GraphReady;
  readonly saved: GraphViewState;
};
