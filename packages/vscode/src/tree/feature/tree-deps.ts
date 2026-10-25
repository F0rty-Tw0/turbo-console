import type { Timings } from '../../shared/common/api.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import type { AtomHostPorts } from '../common/atom-load.type.ts';
import type { TreeProviderDeps } from '../common/tree-node.type.ts';

/** What the tree provider is built from: the run lookup, the first-children spans, the scripts toggle and the Atomizer ports. */
export const treeDepsOf = (
  runs: TreeProviderDeps['runs'],
  timings: Timings,
  scripts: ScriptsToggleApi,
  atom: AtomHostPorts
): TreeProviderDeps => {
  const deps: TreeProviderDeps = { runs, treeVisible: timings.treeVisible, scripts, atom };

  return deps;
};
