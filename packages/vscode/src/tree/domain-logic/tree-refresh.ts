import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import type { RefreshTarget, RunningTasks, TreeNode } from '../common/tree-node.type.ts';
import type { RefreshDeps } from '../common/tree-refresh.type.ts';
import { allRows } from '../utils/all-rows.util.ts';
import { currentTaskOf } from '../utils/current-task.util.ts';
import { pruneNodes } from '../utils/node-cache.util.ts';
import { refreshTarget } from '../utils/refresh-target.util.ts';
import { rowIdOf } from '../utils/row-id.util.ts';
import { isVisibleScript } from '../utils/script-task.util.ts';

/** What to fire after a change, and which cached nodes outlive it: the refresh half of `PackagesTree`. */
export class TreeRefresher {
  private readonly deps: RefreshDeps;
  private readonly stored = new Map<string, Set<string>>();

  public constructor(deps: RefreshDeps) {
    this.deps = deps;
  }

  public refreshFor(change: RootChange): void {
    const { scriptsShown, live } = this.deps.rowContext();
    const target = refreshTarget(change, scriptsShown, live);

    this.fireTarget(change.root, target);
    this.prune(change.root);
  }

  /**
   * Spec 1c-b §4.7: with scripts hidden, a script run entering or leaving `running` adds or drops its package row, so the
   * root redraws (and prunes); every other change fires the task node. `stored` is the `running` ids this class last saw.
   */
  public runChanged(entry: RunEntry): void {
    const { root, taskId } = entry;
    const isMember = entry.state === 'running';
    const wasMember = this.stored.get(root)?.has(taskId) === true;
    const isFlip = isMember !== wasMember;
    const isHiddenScript = this.isHiddenScript(entry);
    const isRootFire = isFlip && isHiddenScript;

    this.remember(root, taskId, isMember);

    if (!isRootFire) {
      this.refreshTask(root, taskId);

      return;
    }

    this.fireTarget(root, 'root');
    this.prune(root);
  }

  /** The scripts toggle changed: `stored` becomes the `running` ids of every root now, whatever it last saw. */
  public reseed(): void {
    const { live } = this.deps.rowContext();

    this.stored.clear();

    for (const entry of this.deps.store.all()) {
      const { root } = entry.state.folder;

      for (const taskId of live(root)) this.remember(root, taskId, true);
    }
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

  /** Fires the cached node of that task; a task never shown (its package collapsed) has none, and nothing fires. */
  private refreshTask(root: string, taskId: string): void {
    const id = rowIdOf('task', root, taskId);
    const node = this.deps.cache.get(id);

    if (node !== undefined) this.deps.fire(node);
  }

  private remember(root: string, taskId: string, isMember: boolean): void {
    const ids = this.stored.get(root) ?? new Set<string>();

    if (isMember) ids.add(taskId);
    else ids.delete(taskId);

    if (ids.size === 0) this.stored.delete(root);
    else this.stored.set(root, ids);
  }

  /** Scripts hidden and the task's node in the model now is a script; a task gone from the model is not one. */
  private isHiddenScript(entry: RunEntry): boolean {
    const { scriptsShown } = this.deps.rowContext();
    const model = this.deps.store.get(entry.root)?.state.model ?? null;

    if (scriptsShown || model === null) return false;

    const task = currentTaskOf(model, entry.packageName, entry.taskId);

    return task !== undefined && isVisibleScript(task);
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
