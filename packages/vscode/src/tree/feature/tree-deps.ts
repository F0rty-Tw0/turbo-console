import type { Timings } from '../../shared/common/api.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import type { SharedAtoms } from '../common/atom-load.type.ts';
import type { TreeProviderDeps } from '../common/tree-node.type.ts';

/** What the tree provider is built from: the run lookup, the first-children spans, the scripts toggle and the shared Atomizer loads. */
export const treeDepsOf = (
  runs: TreeProviderDeps['runs'],
  timings: Timings,
  scripts: ScriptsToggleApi,
  atom: SharedAtoms
): TreeProviderDeps => {
  const deps: TreeProviderDeps = { runs, treeVisible: timings.treeVisible, scripts, atom };

  return deps;
};
