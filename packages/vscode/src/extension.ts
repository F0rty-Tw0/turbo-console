import * as vscode from 'vscode';

import type { PanelsDeps } from './details/common/panel.type.ts';
import { editorPanelHost } from './details/data-access/details-ports.ts';
import { DetailsPanels } from './details/domain-logic/details-panels.ts';
import { registerDetails } from './details/feature/register-details.ts';
import type { Roots } from './roots/common/coordinator.type.ts';
import type { LoadDeps, SessionPorts, SharedLoadPorts } from './roots/common/root.type.ts';
import { coreLoadDeps } from './roots/data-access/core-load-deps.ts';
import { RootsSession } from './roots/domain-logic/roots-session.ts';
import { registerRoots } from './roots/feature/register-roots.ts';
import type { Runs } from './run/common/run.type.ts';
import { editorCopyPorts } from './run/data-access/copy-ports.ts';
import { editorRunAllPorts, editorRunPorts } from './run/data-access/run-ports.ts';
import { forwardRunAllEvents, forwardTaskEvents } from './run/data-access/turbo-tasks.ts';
import { RunSession } from './run/domain-logic/run-session.ts';
import { registerCopy } from './run/feature/register-copy.ts';
import { manifestFile, registerPickers, rootOf } from './run/feature/register-pickers.ts';
import { registerRunAll } from './run/feature/register-run-all.ts';
import { registerRuns } from './run/feature/register-runs.ts';
import type { Timings, TimingsStart, TurboConsoleApi } from './shared/common/api.type.ts';
import type { Output } from './shared/common/output.type.ts';
import type { Span } from './shared/common/span.type.ts';
import { createOutput } from './shared/data-access/output.ts';
import { COMMAND_ITEMS, HELP_ITEMS } from './tree/common/fixed-view.const.ts';
import type { TickerPorts } from './tree/common/ticker.type.ts';
import type { PackagesTreeApi } from './tree/common/tree-node.type.ts';
import type { VisibleView } from './tree/common/visible-view.type.ts';
import { editorPackageActionPorts } from './tree/data-access/package-action-ports.ts';
import { ElapsedTicker } from './tree/domain-logic/elapsed-ticker.ts';
import { TreeVisibility } from './tree/domain-logic/tree-visibility.ts';
import { FixedViewProvider, registerFixedViews } from './tree/feature/fixed-views.ts';
import { registerPackageActions } from './tree/feature/package-actions.ts';
import { PackagesTreeProvider } from './tree/feature/packages-provider.ts';
import { currentTreeMode, registerTree } from './tree/feature/register-tree.ts';
import { watchRoot } from './watch/data-access/root-watchers.ts';
import { registerWatchers } from './watch/feature/register-watchers.ts';

/** The side panel's fixed views and the commands of its rows' inline and context menus (copy, open, reveal). */
const registerPanel = (roots: Roots, commands: FixedViewProvider, help: FixedViewProvider): vscode.Disposable => {
  const views = registerFixedViews(commands, help);
  const copy = registerCopy(roots, editorCopyPorts(), vscode.commands.registerCommand);
  const packageActions = registerPackageActions(roots, editorPackageActionPorts(), vscode.commands.registerCommand);

  return vscode.Disposable.from(views, copy, packageActions);
};

const createSession = (context: vscode.ExtensionContext, output: Output): RootsSession => {
  const cacheDir = context.globalStorageUri.fsPath;
  const depsFor = (root: string, acquire: LoadDeps['acquire']): LoadDeps => {
    const shared: SharedLoadPorts = { cacheDir, log: output.error, acquire };

    return coreLoadDeps(root, shared);
  };
  const ports: SessionPorts = { depsFor, now: () => performance.now(), warn: output.warn };

  return new RootsSession(ports);
};

/** The details panels over the root session; a panel reports its visibility to the session only through this closure. */
const createPanels = (
  context: vscode.ExtensionContext,
  session: RootsSession,
  runs: PanelsDeps['runs'],
  output: Output
): DetailsPanels => {
  const setPanelVisible: PanelsDeps['setPanelVisible'] = (root, panelId, visible) => {
    session.setPanelVisible(root, panelId, visible);
  };
  const host = editorPanelHost(context.extensionUri, output, rootOf);

  return new DetailsPanels({ roots: session.store, runs, host, setPanelVisible });
};

/** The run, pick and run-all commands plus the forwarding of turbo task events. */
const registerRunCommands = (
  session: RootsSession,
  runSession: RunSession,
  tree: PackagesTreeProvider,
  output: Output
): vscode.Disposable => {
  const register = vscode.commands.registerCommand;
  const runs = registerRuns(runSession, tree, session.store, register);
  const pickers = registerPickers(runSession, session.store, register);
  const runAllPorts = editorRunAllPorts(session.store, output);
  const runAll = registerRunAll(session.store, runAllPorts, forwardRunAllEvents, register);

  return vscode.Disposable.from(runs, pickers, runAll, forwardTaskEvents(runSession));
};

/** The activation start and the timing records `activate` fills in. */
const startTimings = (): TimingsStart => {
  const start = performance.now();
  const activation: Span = { start, end: null };
  const timings: Timings = { activation, activationResume: activation, treeVisible: new Map(), runs: [] };
  const started: TimingsStart = { start, timings };

  return started;
};

/** The elapsed ticker on real timers, refreshing task rows of the tree; unbound until the view exists. */
const createTicker = (runs: Runs, tree: PackagesTreeApi): ElapsedTicker => {
  const every: TickerPorts['every'] = (ms, tick) => {
    const interval = setInterval(tick, ms);

    return (): void => {
      clearInterval(interval);
    };
  };
  const fire: TickerPorts['fire'] = (root, taskId) => {
    tree.refreshTask(root, taskId);
  };
  const ports: TickerPorts = { every, fire };

  return new ElapsedTicker(runs, ports);
};

/** Hands the Packages view to the visibility reader and the ticker; the returned binding stops the ticker following it. */
const bindViews = (view: VisibleView, visibility: TreeVisibility, ticker: ElapsedTicker): vscode.Disposable => {
  visibility.bind(view);

  return ticker.bind(view);
};

/**
 * Spec §3 activation: registers the view, commands and listeners, finds the roots and sets the context key. No turbo
 * spawn and no load: the first load starts when the view asks for its children or turns visible. In an untrusted
 * workspace it returns the API with no roots.
 */
export const activate = async (context: vscode.ExtensionContext): Promise<TurboConsoleApi> => {
  const { start, timings } = startTimings();
  const output = createOutput();
  const session = createSession(context, output);
  const runSession = new RunSession(editorRunPorts(output), timings.runs);
  const tree = new PackagesTreeProvider(session.store, runSession.runs.get, currentTreeMode(), timings.treeVisible);
  const commands = new FixedViewProvider(COMMAND_ITEMS);
  const help = new FixedViewProvider(HELP_ITEMS);
  const panels = createPanels(context, session, runSession.runs, output);
  const treeVisibility = new TreeVisibility();
  const ticker = createTicker(runSession.runs, tree);
  const api: TurboConsoleApi = {
    tree,
    commands,
    help,
    runs: runSession.runs,
    timings,
    loads: session.loads,
    whenIdle: async (root: string): Promise<void> => session.whenIdle(root),
    details: panels.api(),
    treeVisible: treeVisibility.read,
    ticker
  };

  context.subscriptions.push(output, tree, session, ticker);

  if (vscode.workspace.isTrusted) {
    context.subscriptions.push(bindViews(registerTree(context, session, tree, output), treeVisibility, ticker));

    const watchers = registerWatchers(session, watchRoot);
    const onRoots = (): void => {
      tree.rootsChanged();
      watchers.prune();
      panels.pruneRoots();
    };
    const details = registerDetails(panels, vscode.commands.registerCommand, manifestFile);

    context.subscriptions.push(
      watchers,
      details,
      registerRunCommands(session, runSession, tree, output),
      registerPanel(session.store, commands, help)
    );

    const rootsFound = registerRoots(context, session, onRoots, output.error);

    // Two spans of this extension's own work, split at the wait for the roots' stat results: with that wait inside,
    // CI runners logged 10–470 ms for identical code, so the wait is left out of the budget.
    timings.activation = { start, end: performance.now() };
    await rootsFound;
  } else {
    timings.activation = { start, end: performance.now() };
  }

  const end = performance.now();

  timings.activationResume = { start: session.rootsFoundAt ?? end, end };

  return api;
};
