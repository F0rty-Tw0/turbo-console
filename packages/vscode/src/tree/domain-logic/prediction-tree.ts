import type { RootChange, RootEntry, Roots } from '../../roots/common/coordinator.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import type { PredictionLookup, SharedPrediction } from '../common/prediction.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';

const rootOf = (entry: RootEntry): string => entry.state.folder.root;

/**
 * The tree's side of the window's shared cache prediction: which node and run events reach `PredictionLoads`, and which
 * nodes redraw: the store names the root and the packages whose prediction changed, and only those package nodes fire. It
 * only reads `cache`, which `PackagesTree` writes, so a fired node is
 * the object VS Code holds; VS Code then asks for that package's children again, and the store ignores a request for a
 * package it already has.
 */
export class PredictionTree {
  public readonly view: PredictionLookup;
  private readonly store: Roots;
  private readonly cache: ReadonlyMap<string, TreeNode>;
  private readonly fire: TreePorts['fire'];
  private readonly shared: SharedPrediction;

  public constructor(store: Roots, cache: ReadonlyMap<string, TreeNode>, ports: Pick<TreePorts, 'prediction' | 'fire'>) {
    this.store = store;
    this.cache = cache;
    this.fire = ports.fire;
    this.shared = ports.prediction;
    this.view = this.shared.view;
    this.shared.onDidChange((root, packageNames) => {
      this.changed(root, packageNames);
    });
  }

  /** Only a package node's own children show its tasks, so only they ask for its prediction. */
  public childrenRequested(node: TreeNode): void {
    if (node.kind !== 'pkg' || node.packageName === null) return;

    this.shared.packageShown(node.root, node.packageName);
  }

  /**
   * A run counts as ended once its summary match settled (`matching` false), not at the process end: the store emits
   * both, and asking at the first would predict from a cache the second is still writing.
   */
  public runChanged(entry: RunEntry): void {
    const hasEnded = entry.state !== 'running' && !entry.matching;

    if (hasEnded) this.shared.runEnded(entry.root);
  }

  public modelChanged(change: RootChange): void {
    this.shared.modelChanged(change);
  }

  /** After roots were added or removed: a root the store no longer holds loses its predictions. */
  public rootsChanged(): void {
    const folders = this.store.all().map(rootOf);

    this.shared.rootsKept(new Set(folders));
  }

  public refreshAll(): void {
    this.shared.refreshAll();
  }

  /** The tree keeps forwarding `dispose` to the shared prediction, which drops every listener and aborts every run. */
  public dispose(): void {
    this.shared.dispose();
  }

  /**
   * Fires the cached nodes of `packageNames` of `root` in one event, so VS Code asks again only for the packages whose
   * prediction changed; none cached (root never opened) fires nothing.
   */
  private changed(root: string, packageNames: ReadonlySet<string>): void {
    const isChangedPackage = (node: TreeNode): boolean => {
      const isNamed = node.packageName !== null && packageNames.has(node.packageName);

      return node.kind === 'pkg' && node.root === root && isNamed;
    };
    const nodes = Array.from(this.cache.values()).filter(isChangedPackage);

    if (nodes.length > 0) this.fire(nodes);
  }
}
