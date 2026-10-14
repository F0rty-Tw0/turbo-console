import * as vscode from 'vscode';

import type { LoadDeps, SessionPorts, SharedLoadPorts } from './roots/common/root.type.ts';
import { coreLoadDeps } from './roots/data-access/core-load-deps.ts';
import { RootsSession } from './roots/domain-logic/roots-session.ts';
import { registerRoots } from './roots/feature/register-roots.ts';
import { editorRunAllPorts, editorRunPorts } from './run/data-access/run-ports.ts';
import { forwardRunAllEvents, forwardTaskEvents } from './run/data-access/turbo-tasks.ts';
import { RunSession } from './run/domain-logic/run-session.ts';
import { registerPickers } from './run/feature/register-pickers.ts';
import { registerRunAll } from './run/feature/register-run-all.ts';
import { registerRuns } from './run/feature/register-runs.ts';
import type { Timings, TurboConsoleApi } from './shared/common/api.type.ts';
import type { Span } from './shared/common/span.type.ts';
import { createOutput } from './shared/data-access/output.ts';
import { COMMAND_ITEMS, HELP_ITEMS } from './tree/common/fixed-view.const.ts';
import { FixedViewProvider, registerFixedViews } from './tree/feature/fixed-views.ts';
import { PackagesTreeProvider } from './tree/feature/packages-provider.ts';
import { currentTreeMode, registerTree } from './tree/feature/register-tree.ts';
import { watchRoot } from './watch/data-access/root-watchers.ts';
import { registerWatchers } from './watch/feature/register-watchers.ts';

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
  const runSession = new RunSession(editorRunPorts(output), timings.runs);
  const tree = new PackagesTreeProvider(session.store, runSession.runs.get, currentTreeMode(), timings.treeVisible);
  const whenIdle = async (root: string): Promise<void> => session.whenIdle(root);
  const commands = new FixedViewProvider(COMMAND_ITEMS);
  const help = new FixedViewProvider(HELP_ITEMS);
  const api: TurboConsoleApi = { tree, commands, help, runs: runSession.runs, timings, loads: session.loads, whenIdle };
  const disposeSession = (): void => {
    session.dispose();
  };

  context.subscriptions.push(output, tree, { dispose: disposeSession });

  if (vscode.workspace.isTrusted) {
    registerTree(context, session, tree, output);

    const watchers = registerWatchers(session, watchRoot);
    const onRoots = (): void => {
      tree.rootsChanged();
      watchers.prune();
    };

    const runs = registerRuns(runSession, tree, session.store, vscode.commands.registerCommand);

    const pickers = registerPickers(runSession, session.store, vscode.commands.registerCommand);

    const runAll = registerRunAll(
      session.store,
      editorRunAllPorts(session.store, output),
      forwardRunAllEvents,
      vscode.commands.registerCommand
    );

    context.subscriptions.push(watchers, runs, pickers, runAll, registerFixedViews(commands, help), forwardTaskEvents(runSession));

    await registerRoots(context, session, onRoots, output.error);
  }

  timings.activation = { start, end: performance.now() };

  return api;
};
