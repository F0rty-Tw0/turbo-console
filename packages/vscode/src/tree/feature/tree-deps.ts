import * as vscode from 'vscode';

import type { Timings } from '../../shared/common/api.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import { HAS_SCRIPTS_KEY } from '../common/has-scripts.const.ts';
import type { IconThemeProbe } from '../common/icon-theme.type.ts';
import type { SharedLoads } from '../common/shared-loads.type.ts';
import { SINGLE_PACKAGE_KEY } from '../common/single-package-key.const.ts';
import type { TreeContext } from '../common/tree-context.type.ts';
import type { TreeProviderDeps } from '../common/tree-node.type.ts';

const setHasScripts = async (value: boolean): Promise<void> => {
  await vscode.commands.executeCommand('setContext', HAS_SCRIPTS_KEY, value);
};

const setSinglePackage = async (value: boolean): Promise<void> => {
  await vscode.commands.executeCommand('setContext', SINGLE_PACKAGE_KEY, value);
};

/**
 * What the tree provider is built from: the run lookup, the first-children spans, the scripts toggle, the shared loads
 * (Atomizer, cache prediction and affected), the `turboConsole.hasScripts` and `turboConsole.singlePackage` sends and `log` for a send that fails.
 */
export const treeDepsOf = (
  runs: TreeProviderDeps['runs'],
  timings: Timings,
  scripts: ScriptsToggleApi,
  loads: SharedLoads,
  log: (line: string) => void
  // eslint-disable-next-line max-params -- the provider's inputs `extension.ts` passes, one line there
): TreeProviderDeps => {
  const deps: TreeProviderDeps = {
    runs,
    treeVisible: timings.treeVisible,
    scripts,
    atom: loads.atoms,
    prediction: loads.prediction,
    affected: loads.affected,
    setHasScripts,
    setSinglePackage,
    log
  };

  return deps;
};

/** What `registerTree` reads of the extension context, with the scope, scripts, prediction and affected toggles, the affected store's reads and the icon theme's folder probe beside it. */
export const contextOf = (
  context: Pick<vscode.ExtensionContext, 'subscriptions'>,
  toggles: Pick<TreeContext, 'scope' | 'scripts' | 'prediction' | 'affected'>,
  iconTheme: IconThemeProbe,
  affectedLoads: TreeContext['affectedLoads']
): TreeContext => {
  const { subscriptions } = context;
  const { scope, scripts, prediction, affected } = toggles;
  const treeContext: TreeContext = { subscriptions, scope, scripts, prediction, affected, affectedLoads, iconTheme };

  return treeContext;
};
