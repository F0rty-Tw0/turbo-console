import type { LiveIds, RunLookup } from '../../../run/common/run.type.ts';
import type { ScriptsToggleApi } from '../../../shared/common/scripts-toggle.type.ts';
import { scriptsToggleMock } from '../../../shared/test/mocks/scripts-toggle.mock.ts';
import type { TreeProviderDeps } from '../../common/tree-node.type.ts';

const NEVER_RAN: RunLookup = () => undefined;

const NOTHING_LIVE: LiveIds = () => new Set();

/** The provider's deps with every run lookup answering `get`, an empty span map and the scripts toggle (hidden unless given). */
export const providerDepsOf = (get: RunLookup = NEVER_RAN, scripts: ScriptsToggleApi = scriptsToggleMock()): TreeProviderDeps => {
  const runs: TreeProviderDeps['runs'] = { get, runningIds: NOTHING_LIVE };
  const deps: TreeProviderDeps = { runs, treeVisible: new Map(), scripts };

  return deps;
};
