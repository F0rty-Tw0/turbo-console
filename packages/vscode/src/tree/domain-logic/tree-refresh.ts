import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { RefreshTarget, RunningTasks, TreeNode } from '../common/tree-node.type.ts';
import type { RefreshDeps } from '../common/tree-refresh.type.ts';
import { allRows } from '../utils/all-rows.util.ts';
import { pruneNodes } from '../utils/node-cache.util.ts';
import { refreshTarget } from '../utils/refresh-target.util.ts';
import { rowIdOf } from '../utils/row-id.util.ts';

/** What to fire after a change, and which cached nodes outlive it: the refresh half of `PackagesTree`. */
export class TreeRefresher {
  private readonly deps: RefreshDeps;

  public constructor(deps: RefreshDeps) {
    this.deps = deps;
  }

  public refreshFor(change: RootChange): void {
    const target = refreshTarget(change);

    this.fireTarget(change.root, target);
    this.prune(change.root);
  }

  /** Fires the cached node of that task; a task never shown (its package collapsed) has none, and nothing fires. */
  public refreshTask(root: string, taskId: string): void {
    const id = rowIdOf('task', root, taskId);
    const node = this.deps.cache.get(id);

    if (node !== undefined) this.deps.fire(node);
  }

  /** One fire with the cached nodes of all `running` tasks (spec §4.6 tick); tasks never shown are skipped. */
  public refreshTasks(running: RunningTasks): void {
    const nodes: TreeNode[] = [];

    for (const [root, ids] of running) {
      for (const taskId of ids) {
        const id = rowIdOf('task', root, taskId);
        const node = this.deps.cache.get(id);

        if (node !== undefined) nodes.push(node);
      }
    }

    if (nodes.length > 0) this.deps.fire(nodes);
  }

  /** Keeps every row id the root has now (plus its own node in a multi-root window); a removed root keeps none. */
  public prune(root: string): void {
    const keep = this.keptIds(root);

    pruneNodes(this.deps.cache, root, keep);
  }

  private fireTarget(root: string, target: RefreshTarget): void {
    if (target !== 'root') {
      this.firePackages(root, target);

      return;
    }

    const node = this.rootNodeOf(root);

    this.deps.fire(node);
  }

  private firePackages(root: string, names: string[]): void {
    for (const name of names) {
      const id = rowIdOf('pkg', root, name);
      const node = this.deps.cache.get(id);

      if (node !== undefined) this.deps.fire(node);
    }
  }

  /** The root's own node in a multi-root window; `undefined` (the whole tree) in a single-root one or when not shown. */
  private rootNodeOf(root: string): TreeNode | undefined {
    const isMultiRoot = this.isMultiRoot();

    if (!isMultiRoot) return undefined;

    const id = rowIdOf('root', root, root);

    return this.deps.cache.get(id);
  }

  private keptIds(root: string): Set<string> {
    const entry = this.deps.store.get(root);

    if (entry === undefined) return new Set();

    const context = this.deps.rowContext();
    const rows = allRows(entry.state, context);
    const keep = new Set(rows.map((row) => row.id));
    const isMultiRoot = this.isMultiRoot();

    if (isMultiRoot) keep.add(rowIdOf('root', root, root));

    return keep;
  }

  private isMultiRoot(): boolean {
    return this.deps.store.all().length > 1;
  }
}
