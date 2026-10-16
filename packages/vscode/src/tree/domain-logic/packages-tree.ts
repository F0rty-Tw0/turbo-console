import { ModelViews } from './model-views.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { ModelViewsOf } from '../common/model-view.type.ts';
import type { RefreshTarget, RowContext, TreeNode, TreePorts } from '../common/tree-node.type.ts';
import type { TreeMode, TreeRow } from '../common/tree-row.type.ts';
import { allRows } from '../utils/all-rows.util.ts';
import { nodesOf, pruneNodes } from '../utils/node-cache.util.ts';
import { childRowsOf, currentRowOf, goneRowOf } from '../utils/node-rows.util.ts';
import { refreshTarget } from '../utils/refresh-target.util.ts';
import { rootNodeRow, rootRows } from '../utils/root-rows.util.ts';
import { rowIdOf } from '../utils/row-id.util.ts';
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
  private readonly views = new ModelViews();
  private readonly viewOf: ModelViewsOf = (model) => this.views.of(model);
  private mode: TreeMode;
  private scopeShown = false;

  public constructor(store: Roots, mode: TreeMode, ports: TreePorts) {
    this.store = store;
    this.mode = mode;
    this.ports = ports;
  }

  /** No node: the single root's rows, or one node per root. A root's rows wait for its first answer (spec §4.3). */
  public async children(node?: TreeNode): Promise<TreeNode[]> {
    if (node === undefined) return this.topChildren();

    if (node.kind === 'root') return this.rootChildren(node.root);

    const entry = this.store.get(node.root);

    if (entry === undefined) return [];

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
    const target = refreshTarget(change);

    this.fireTarget(change.root, target);
    this.prune(change.root);
  }

  public setMode(mode: TreeMode): void {
    this.mode = mode;
    this.redraw();
  }

  /** Spec §4.8: relabels every package row with one redraw; the views do not depend on it, so none is rebuilt. */
  public setScopeShown(value: boolean): void {
    this.scopeShown = value;
    this.redraw();
  }

  public isScopeShown(): boolean {
    return this.scopeShown;
  }

  /** After roots were added or removed: redraws the whole tree and forgets the nodes of a removed root. */
  public rootsChanged(): void {
    this.redraw();
  }

  /** Fires the cached node of that task; a task never shown (its package collapsed) has none, and nothing fires. */
  public refreshTask(root: string, taskId: string): void {
    const id = rowIdOf('task', root, taskId);
    const node = this.cache.get(id);

    if (node !== undefined) this.ports.fire(node);
  }

  private rowContext(): RowContext {
    const context: RowContext = { mode: this.mode, runs: this.ports.runs, views: this.viewOf, scopeShown: this.scopeShown };

    return context;
  }

  private async topChildren(): Promise<TreeNode[]> {
    const entries = this.store.all();
    const [only] = entries;

    if (entries.length === 1 && only !== undefined) return this.rootChildren(only.state.folder.root);

    const rows = entries.map((entry) => rootNodeRow(entry.state.folder));

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

  private fireTarget(root: string, target: RefreshTarget): void {
    if (target !== 'root') {
      this.firePackages(root, target);

      return;
    }

    const node = this.rootNodeOf(root);

    this.ports.fire(node);
  }

  private firePackages(root: string, names: string[]): void {
    for (const name of names) {
      const id = rowIdOf('pkg', root, name);
      const node = this.cache.get(id);

      if (node !== undefined) this.ports.fire(node);
    }
  }

  /** The root's own node in a multi-root window; `undefined` (the whole tree) in a single-root one or when not shown. */
  private rootNodeOf(root: string): TreeNode | undefined {
    const isMultiRoot = this.isMultiRoot();

    if (!isMultiRoot) return undefined;

    const id = rowIdOf('root', root, root);

    return this.cache.get(id);
  }

  private redraw(): void {
    const cached = Array.from(this.cache.values(), (node) => node.root);
    const current = this.store.all().map((entry) => entry.state.folder.root);
    const roots = new Set([...cached, ...current]);

    this.ports.fire(undefined);

    for (const root of roots) this.prune(root);
  }

  /** Keeps every row id the root has now (plus its own node in a multi-root window); a removed root keeps none. */
  private prune(root: string): void {
    const keep = this.keptIds(root);

    pruneNodes(this.cache, root, keep);
  }

  private keptIds(root: string): Set<string> {
    const entry = this.store.get(root);

    if (entry === undefined) return new Set();

    const context = this.rowContext();
    const rows = allRows(entry.state, context);
    const keep = new Set(rows.map((row) => row.id));
    const isMultiRoot = this.isMultiRoot();

    if (isMultiRoot) keep.add(rowIdOf('root', root, root));

    return keep;
  }

  private isMultiRoot(): boolean {
    return this.store.all().length > 1;
  }
}
