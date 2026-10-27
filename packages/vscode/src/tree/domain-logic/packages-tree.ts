import { AtomTree } from './atom-tree.ts';
import { ModelViews } from './model-views.ts';
import { TreeRefresher } from './tree-refresh.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import type { ToolLookup } from '../../tool/common/tool.type.ts';
import { resolveTool } from '../../tool/utils/tool-of.util.ts';
import type { ModelViewsOf } from '../common/model-view.type.ts';
import type { RowContext, RunningTasks, TreeNode, TreePorts } from '../common/tree-node.type.ts';
import type { IconsMode, RunningCountsMemo, TreeMode, TreeRow } from '../common/tree-row.type.ts';
import { nodesOf } from '../utils/node-cache.util.ts';
import { childRowsOf, currentRowOf, goneRowOf } from '../utils/node-rows.util.ts';
import { rootRowOf, rootRows } from '../utils/root-rows.util.ts';
import { markAsked, markShown } from '../utils/tree-visible-span.util.ts';

/**
 * The Packages view without the editor: which nodes sit under which, the current row of a node, and which nodes to
 * refresh after a change. One node object per row id while the row exists (spec §4.3 identity), so `ports.fire` with
 * it refreshes that item; after every redraw a root's cache keeps exactly the ids of every row it has now.
 */
export class PackagesTree {
  private readonly store: Roots;
  private readonly ports: TreePorts;
  private readonly cache = new Map<string, TreeNode>();
  private readonly views = new ModelViews(resolveTool);
  private readonly countsMemo: RunningCountsMemo = new WeakMap();
  private readonly viewOf: ModelViewsOf = (model, scriptsShown, live) => this.views.of(model, scriptsShown, live);
  private readonly toolOfCommand: ToolLookup = (pkg, singlePackage, command) => this.views.toolOf(pkg, singlePackage, command);
  private readonly refresher: TreeRefresher;
  private readonly atoms: AtomTree;
  private mode: TreeMode;
  private icons: IconsMode;
  private scopeShown = false;

  public constructor(store: Roots, mode: TreeMode, icons: IconsMode, ports: TreePorts) {
    this.store = store;
    this.mode = mode;
    this.icons = icons;
    this.ports = ports;

    const rowContext = (): RowContext => this.rowContext();

    this.refresher = new TreeRefresher({ store, cache: this.cache, fire: ports.fire, rowContext });
    this.atoms = new AtomTree(store, this.cache, ports);
  }

  /** No node: the single root's rows, or one node per root. A root's rows wait for its first answer (spec §4.3). */
  public async children(node?: TreeNode): Promise<TreeNode[]> {
    if (node === undefined) return this.topChildren();

    if (node.kind === 'root') return this.rootChildren(node.root);

    const entry = this.store.get(node.root);

    if (entry === undefined) return [];

    this.atoms.childrenRequested(node);

    const context = this.rowContext();
    const rows = childRowsOf(entry.state, node, context);

    return nodesOf(this.cache, rows);
  }

  public rowOf(node: TreeNode): TreeRow {
    const entry = this.store.get(node.root);

    if (entry === undefined) return goneRowOf(node);

    const context = this.rowContext();

    return currentRowOf(entry.state, node, context);
  }

  public refreshFor(change: RootChange): void {
    this.atoms.modelChanged(change);
    this.refresher.refreshFor(change);
  }

  public setMode(mode: TreeMode): void {
    this.mode = mode;
    this.redraw();
  }

  /** `watchIcons` sets the mode on every resolve; only a change redraws. */
  public setIcons(icons: IconsMode): void {
    if (icons === this.icons) return;

    this.icons = icons;
    this.redraw();
  }

  public iconsMode(): IconsMode {
    return this.icons;
  }

  /** Spec §4.8: relabels every package row with one redraw; the views do not depend on it, so none is rebuilt. */
  public setScopeShown(value: boolean): void {
    this.scopeShown = value;
    this.redraw();
  }

  public isScopeShown(): boolean {
    return this.scopeShown;
  }

  /** The scripts toggle changed: the live set is read again, then one redraw; the rows read the new choice. */
  public scriptsChanged(): void {
    this.refresher.reseed();
    this.redraw();
  }

  /** After roots were added or removed: a removed root loses its Atomizer loads and its nodes, then the whole tree redraws. */
  public rootsChanged(): void {
    this.atoms.rootsChanged();
    this.redraw();
  }

  public runChanged(entry: RunEntry): void {
    this.refresher.runChanged(entry);
    this.atoms.runChanged(entry);
  }

  public refreshTasks(running: RunningTasks): void {
    this.refresher.refreshTasks(running);
  }

  /** The Refresh command: every Atomizer package loaded so far loads again; one never opened stays unloaded. */
  public refreshAtoms(): void {
    this.atoms.refreshAll();
  }

  /** Aborts the pending Atomizer loads; none of them redraws anything afterwards. */
  public dispose(): void {
    this.atoms.dispose();
  }

  private rowContext(): RowContext {
    const { runs, runningIds, scriptsShown, wallNow } = this.ports;
    const context: RowContext = {
      mode: this.mode,
      runs,
      views: this.viewOf,
      scopeShown: this.scopeShown,
      scriptsShown: scriptsShown(),
      live: runningIds,
      now: wallNow(),
      countsMemo: this.countsMemo,
      tools: this.toolOfCommand,
      atoms: this.atoms.view
    };

    return context;
  }

  private async topChildren(): Promise<TreeNode[]> {
    const entries = this.store.all();
    const [only] = entries;

    if (entries.length === 1 && only !== undefined) return this.rootChildren(only.state.folder.root);

    const context = this.rowContext();
    const rows = entries.map((entry) => rootRowOf(entry.state, context));

    return nodesOf(this.cache, rows);
  }

  /** The state is read again after the wait: the load it waited for replaced it. */
  private async rootChildren(root: string): Promise<TreeNode[]> {
    const entry = this.store.get(root);

    if (entry === undefined) return [];

    markAsked(this.ports.treeVisible, root, this.ports.now());
    await entry.coordinator.firstChildren();

    const state = this.store.get(root)?.state;

    if (state === undefined) return [];

    const context = this.rowContext();
    const rows = rootRows(state, context);

    markShown(this.ports.treeVisible, root, rows, this.ports.now());

    return nodesOf(this.cache, rows);
  }

  private redraw(): void {
    const cached = Array.from(this.cache.values(), (node) => node.root);
    const current = this.store.all().map((entry) => entry.state.folder.root);
    const roots = new Set([...cached, ...current]);

    this.ports.fire(undefined);

    for (const root of roots) this.refresher.prune(root);
  }
}
