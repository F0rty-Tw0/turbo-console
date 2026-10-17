import type { WorkspaceModel } from '../../../workspace/common/workspace-model.type.ts';

/** A cache read with its freshness check already run: the plain value the specs compare reads against. */
export type SettledRead = {
  readonly model: WorkspaceModel;
  readonly isFresh: boolean;
};
