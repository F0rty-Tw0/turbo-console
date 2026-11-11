import type { RootChange, RootEntry, Roots } from '../../roots/common/coordinator.type.ts';
import type { SharedAffected } from '../common/affected.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import { rowIdOf } from '../utils/row-id.util.ts';

const rootOf = (entry: RootEntry): string => entry.state.folder.root;

/**
 * The tree's side of the window's shared affected store: which root and model events reach `AffectedLoads`, and
 * which node redraws when the store changes a root. A run end never reaches it (spec §5). It only reads `cache`, which
 * `PackagesTree` writes, so a fired node is the object VS Code holds.
 */
export class AffectedTree {
  public readonly reads: Pick<SharedAffected, 'view' | 'status'>;
  private readonly store: Roots;
  private readonly cache: ReadonlyMap<string, TreeNode>;
  private readonly fire: TreePorts['fire'];
  private readonly shared: SharedAffected;

  public constructor(store: Roots, cache: ReadonlyMap<string, TreeNode>, ports: Pick<TreePorts, 'affected' | 'fire'>) {
    this.store = store;
    this.cache = cache;
    this.fire = ports.fire;
    this.shared = ports.affected;
    this.reads = { view: this.shared.view, status: this.shared.status };
    this.shared.onDidChange((root) => {
      this.changed(root);
    });
  }

  /** Only a root's own children show its tasks, so only they ask for its affected tasks. */
  public rootShown(root: string): void {
    this.shared.rootShown(root);
  }

  public modelChanged(change: RootChange): void {
    this.shared.modelChanged(change);
  }

  /** After roots were added or removed: a root the store no longer holds loses its affected tasks. */
  public rootsChanged(): void {
    const folders = this.store.all().map(rootOf);

    this.shared.rootsKept(new Set(folders));
  }

  /** The tree keeps forwarding `dispose` to the shared affected store, which drops every listener and aborts every query. */
  public dispose(): void {
    this.shared.dispose();
  }

  /**
   * One root in the store: the whole tree redraws (a single root has no root row). Several: only that root's row, and
   * VS Code then asks for its children again; a root row never drawn fires nothing.
   */
  private changed(root: string): void {
    const isSingleRoot = this.store.all().length === 1;

    if (isSingleRoot) {
      this.fire(undefined);

      return;
    }

    const node = this.cache.get(rowIdOf('root', root, root));

    if (node !== undefined) this.fire(node);
  }
}
