import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';

/** The packages that share one parent folder, rows sorted by name; `folder` is `''` for the root. */
export type FolderGroup = {
  readonly folder: string;
  readonly packages: GraphPackage[];
};
