import * as vscode from 'vscode';

import { registerCodeLens } from './codelens/feature/register-codelens.ts';
import { createPanels } from './details/details-wiring.ts';
import { registerDetails } from './details/feature/register-details.ts';
import { createGraph } from './graph/graph-wiring.ts';
import type { Roots } from './roots/common/coordinator.type.ts';
import type { LoadDeps, SessionPorts, SharedLoadPorts } from './roots/common/root.type.ts';
import { coreLoadDeps } from './roots/data-access/core-load-deps.ts';
import { RootsSession } from './roots/domain-logic/roots-session.ts';
import { registerRoots } from './roots/feature/register-roots.ts';
import { editorCopyPorts } from './run/data-access/copy-ports.ts';
import { editorRunAllPorts, editorRunPorts } from './run/data-access/run-ports.ts';
import { forwardRunAllEvents, forwardTaskEvents } from './run/data-access/turbo-tasks.ts';
import { RunSession } from './run/domain-logic/run-session.ts';
import { registerCopy } from './run/feature/register-copy.ts';
import { manifestFile, registerPickers } from './run/feature/register-pickers.ts';
import { registerRunAll } from './run/feature/register-run-all.ts';
import { registerRuns } from './run/feature/register-runs.ts';
import type { RunCommandsUi, Timings, TimingsStart, TurboConsoleApi } from './shared/common/api.type.ts';
import type { Output } from './shared/common/output.type.ts';
import type { ScriptsToggleApi } from './shared/common/scripts-toggle.type.ts';
import type { Span } from './shared/common/span.type.ts';
import { createOutput } from './shared/data-access/output.ts';
import { editorScriptsTogglePorts } from './shared/data-access/scripts-toggle-ports.ts';
import { ScriptsToggle } from './shared/domain-logic/scripts-toggle.ts';
import { COMMAND_ITEMS, HELP_ITEMS } from './tree/common/fixed-view.const.ts';
import type { TreeContext } from './tree/common/tree-context.type.ts';
import type { VisibleView } from './tree/common/visible-view.type.ts';
import { editorAtomPorts } from './tree/data-access/atom-ports.ts';
import { editorOpenSpecPorts } from './tree/data-access/open-spec-ports.ts';
import { editorPackageActionPorts } from './tree/data-access/package-action-ports.ts';
import { tickerPortsOf } from './tree/data-access/ticker-ports.ts';
import { ElapsedTicker } from './tree/domain-logic/elapsed-ticker.ts';
import { sharedAtomsOf } from './tree/domain-logic/shared-atoms.ts';
import { TreeVisibility } from './tree/domain-logic/tree-visibility.ts';
import { FixedViewProvider, registerFixedViews } from './tree/feature/fixed-views.ts';
import { registerOpenSpec } from './tree/feature/open-spec.ts';
import { registerPackageActions } from './tree/feature/package-actions.ts';
import { PackagesTreeProvider } from './tree/feature/packages-provider.ts';
import { currentIcons, currentTreeMode, registerTree } from './tree/feature/register-tree.ts';
import { treeDepsOf } from './tree/feature/tree-deps.ts';
import type { RootWatchers } from './watch/common/watch.type.ts';
import { watchRoot } from './watch/data-access/root-watchers.ts';
import { registerWatchers } from './watch/feature/register-watchers.ts';

/** The side panel's fixed views and the commands of its rows' inline and context menus (copy, open, reveal, open spec). */
const registerPanel = (roots: Roots, commands: FixedViewProvider, help: FixedViewProvider): vscode.Disposable => {
  const views = registerFixedViews(commands, help);
  const copy = registerCopy(roots, editorCopyPorts(), vscode.commands.registerCommand);
  const packageActions = registerPackageActions(roots, editorPackageActionPorts(), vscode.commands.registerCommand);
  const openSpec = registerOpenSpec(roots, editorOpenSpecPorts(), vscode.commands.registerCommand);

  return vscode.Disposable.from(views, copy, packageActions, openSpec);
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

/** The run, pick and run-all commands, the forwarding of turbo task events and the package.json CodeLens. */
const registerRunCommands = (session: RootsSession, runSession: RunSession, ui: RunCommandsUi, output: Output): vscode.Disposable => {
  const register = vscode.commands.registerCommand;
  const runs = registerRuns(runSession, ui.tree, session.store, register);
  const pickers = registerPickers(runSession, session.store, register, () => ui.scripts.isShown());
  const runAllPorts = editorRunAllPorts(session.store, output);
  const runAll = registerRunAll(session.store, runAllPorts, forwardRunAllEvents, register);

  return vscode.Disposable.from(runs, pickers, runAll, forwardTaskEvents(runSession), registerCodeLens(session.store, ui.scripts));
};

/** The activation start and the timing records `activate` fills in. */
const startTimings = (): TimingsStart => {
  const start = performance.now();
  const activation: Span = { start, end: null };
  const timings: Timings = { activation, activationResume: activation, treeVisible: new Map(), runs: [] };
  const started: TimingsStart = { start, timings };

  return started;
};

/** What `registerTree` reads of the extension context, with the scripts toggle beside it. */
const contextOf = (context: vscode.ExtensionContext, scripts: ScriptsToggleApi): TreeContext => {
  const { subscriptions, workspaceState } = context;
  const treeContext: TreeContext = { subscriptions, workspaceState, scripts };

  return treeContext;
};

/** Hands the Packages view to the visibility reader and the ticker; the returned binding stops the ticker following it. */
const bindViews = (view: VisibleView, visibility: TreeVisibility, ticker: ElapsedTicker): vscode.Disposable => {
  visibility.bind(view);

  return ticker.bind(view);
};

/** A registry of per-root panels: `pruneRoots` closes the panels of roots that left the store. */
type RootsPruner = {
  readonly pruneRoots: () => void;
};

/** What a roots change does: the tree redraws, the watchers drop gone roots and each panel registry closes its gone roots' panels. */
const rootsChangedOf = (
  tree: Pick<PackagesTreeProvider, 'rootsChanged'>,
  watchers: Pick<RootWatchers, 'prune'>,
  panels: RootsPruner[]
): (() => void) => {
  const onRoots = (): void => {
    tree.rootsChanged();
    watchers.prune();

    for (const panel of panels) panel.pruneRoots();
  };

  return onRoots;
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
  const scripts = new ScriptsToggle(editorScriptsTogglePorts(context.workspaceState, output));
  const atoms = sharedAtomsOf(session.store, editorAtomPorts(session.store, output));
  const treeDeps = treeDepsOf(runSession.runs, timings, scripts, atoms);
  const tree = new PackagesTreeProvider(session.store, currentTreeMode(), currentIcons(), treeDeps);
  const commands = new FixedViewProvider(COMMAND_ITEMS);
  const help = new FixedViewProvider(HELP_ITEMS);
  const panels = createPanels(context, session, { runs: runSession.runs, scripts }, output);
  const graph = createGraph(context, session, panels, output, { runs: runSession.runs, atoms });
  const treeVisibility = new TreeVisibility();
  const ticker = new ElapsedTicker(runSession.runs, tickerPortsOf(tree));
  const api: TurboConsoleApi = {
    tree,
    commands,
    help,
    runs: runSession.runs,
    timings,
    loads: session.loads,
    whenIdle: async (root: string): Promise<void> => session.whenIdle(root),
    details: panels.api(),
    graph: graph.api,
    treeVisible: treeVisibility.read,
    ticker: ticker.api()
  };

  context.subscriptions.push(output, tree, session, ticker, scripts);

  if (vscode.workspace.isTrusted) {
    context.subscriptions.push(bindViews(registerTree(contextOf(context, scripts), session, tree, output), treeVisibility, ticker));

    const watchers = registerWatchers(session, watchRoot);

    context.subscriptions.push(
      watchers,
      registerDetails(panels, vscode.commands.registerCommand, manifestFile),
      graph.register(),
      registerRunCommands(session, runSession, { tree, scripts }, output),
      registerPanel(session.store, commands, help)
    );

    const rootsFound = registerRoots(context, session, rootsChangedOf(tree, watchers, [panels, graph]), output.error);

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
