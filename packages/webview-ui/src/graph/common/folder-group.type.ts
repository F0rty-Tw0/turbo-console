import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';

/** The packages that share one parent folder, rows sorted by name. */
export type FolderGroup = {
  readonly folder: string;
  readonly packages: GraphPackage[];
};
