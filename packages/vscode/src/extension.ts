import * as vscode from 'vscode';

import type { LoadDeps, SessionPorts, SharedLoadPorts } from './roots/common/root.type.ts';
import { coreLoadDeps } from './roots/data-access/core-load-deps.ts';
import { RootsSession } from './roots/domain-logic/roots-session.ts';
import { registerRoots } from './roots/feature/register-roots.ts';
import type { Timings, TurboConsoleApi } from './shared/common/api.type.ts';
import type { Span } from './shared/common/span.type.ts';
import { createOutput } from './shared/data-access/output.ts';
import { PackagesTreeProvider } from './tree/feature/packages-provider.ts';
import { currentTreeMode, registerTree } from './tree/feature/register-tree.ts';

/**
 * Spec §3 activation: registers the view, commands and listeners, finds the roots and sets the context key. No turbo
 * spawn and no load: the first load starts when the view asks for its children or turns visible. In an untrusted
 * workspace it returns the API with no roots.
 */
export const activate = async (context: vscode.ExtensionContext): Promise<TurboConsoleApi> => {
  const start = performance.now();
  const activation: Span = { start, end: null };
  const timings: Timings = { activation, treeVisible: new Map(), runs: [] };
  const output = createOutput();
  const cacheDir = context.globalStorageUri.fsPath;
  const depsFor = (root: string, acquire: LoadDeps['acquire']): LoadDeps => {
    const shared: SharedLoadPorts = { cacheDir, log: output.error, acquire };

    return coreLoadDeps(root, shared);
  };
  const ports: SessionPorts = { depsFor, now: () => performance.now(), warn: output.warn };
  const session = new RootsSession(ports);
  const tree = new PackagesTreeProvider(session.store, () => undefined, currentTreeMode(), timings.treeVisible);
  const whenIdle = async (root: string): Promise<void> => session.whenIdle(root);
  const api: TurboConsoleApi = { tree, timings, loads: session.loads, whenIdle };
  const disposeRoots = (): void => {
    session.setRoots([]);
  };
  const onRoots = (): void => {
    tree.rootsChanged();
  };

  context.subscriptions.push(output, tree, { dispose: disposeRoots });

  if (vscode.workspace.isTrusted) {
    registerTree(context, session, tree, output);
    await registerRoots(context, session, onRoots, output.error);
  }

  timings.activation = { start, end: performance.now() };

  return api;
};
