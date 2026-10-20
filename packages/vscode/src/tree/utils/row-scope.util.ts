import type { WorkspaceModel } from '@turbo-console/core';

import type { RowScope } from '../common/tree-row.type.ts';

/** `root` is the folder root the caller keys rows and runs on; `model.root` can differ from it (it is resolved). */
export const rowScopeOf = (root: string, model: WorkspaceModel): RowScope => {
  const scope: RowScope = { root, packageManager: model.packageManager, singlePackage: model.singlePackage };

  return scope;
};
