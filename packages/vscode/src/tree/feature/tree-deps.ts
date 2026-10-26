import * as vscode from 'vscode';

import type { Timings } from '../../shared/common/api.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import type { SharedAtoms } from '../common/atom-load.type.ts';
import { HAS_SCRIPTS_KEY } from '../common/has-scripts.const.ts';
import type { TreeProviderDeps } from '../common/tree-node.type.ts';

const setHasScripts = async (value: boolean): Promise<void> => {
  await vscode.commands.executeCommand('setContext', HAS_SCRIPTS_KEY, value);
};

/**
 * What the tree provider is built from: the run lookup, the first-children spans, the scripts toggle, the shared Atomizer
 * loads, the `turboConsole.hasScripts` send and `log` for a send that fails.
 */
export const treeDepsOf = (
  runs: TreeProviderDeps['runs'],
  timings: Timings,
  scripts: ScriptsToggleApi,
  atom: SharedAtoms,
  log: (line: string) => void
  // eslint-disable-next-line max-params -- the provider's inputs `extension.ts` passes, one line there
): TreeProviderDeps => {
  const deps: TreeProviderDeps = { runs, treeVisible: timings.treeVisible, scripts, atom, setHasScripts, log };

  return deps;
};
