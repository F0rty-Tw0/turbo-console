import type { AtomGroup, WorkspaceModel } from '@turbo-console/core';

import { AtomLoads } from './atom-loads.ts';
import type { RootChange, RootEntry, Roots } from '../../roots/common/coordinator.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import type { AtomLoadPorts } from '../common/atom-load.type.ts';
import type { AtomLookup, AtomView } from '../common/atom-view.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import { rowIdOf } from '../utils/row-id.util.ts';

const rootOf = (entry: RootEntry): string => entry.state.folder.root;

/**
 * The tree's side of the Atomizer loads (spec 3.5): which node and run events reach `AtomLoads`, and which nodes redraw
 * when a package's view changed. It only reads `cache`, which `PackagesTree` writes, so a fired node is the object VS
 * Code holds; VS Code then asks for that umbrella's children again, and `AtomLoads` ignores a request once it has an entry.
 */
export class AtomTree {
  public readonly view: AtomLookup;
  private readonly store: Roots;
  private readonly cache: ReadonlyMap<string, TreeNode>;
  private readonly fire: TreePorts['fire'];
  private readonly loads: AtomLoads;

  public constructor(store: Roots, cache: ReadonlyMap<string, TreeNode>, ports: Pick<TreePorts, 'atom' | 'fire'>) {
    const changed: AtomLoadPorts['changed'] = (root, packageName) => {
      this.changed(root, packageName);
    };
    const modelOf = (root: string): WorkspaceModel | null => store.get(root)?.state.model ?? null;

    this.store = store;
    this.cache = cache;
    this.fire = ports.fire;
    this.loads = new AtomLoads({ ...ports.atom, changed }, modelOf);
    this.view = (root: string, packageName: string): AtomView => this.loads.view(root, packageName);
  }

  /** Only a group umbrella's own children start its package's load; any other node's children start nothing. */
  public childrenRequested(node: TreeNode): void {
    if (node.kind !== 'task' || node.packageName === null) return;

    const { groups } = this.view(node.root, node.packageName);
    const isUmbrella = groups.some((group) => group.umbrella.id === node.key);

    if (isUmbrella) this.loads.childrenRequested(node.root, node.packageName);
  }

  /**
   * A run counts as ended once its summary match settled (`matching` false), not at the process end: the store emits
   * both, and reloading on the first would abort a load the second restarts at once.
   */
  public runChanged(entry: RunEntry): void {
    const hasEnded = entry.state !== 'running' && !entry.matching;

    if (hasEnded) this.loads.runEnded(entry.root, entry.packageName);
  }

  public modelChanged(change: RootChange): void {
    this.loads.modelChanged(change.root, change.after);
  }

  /** After roots were added or removed: a root the store no longer holds loses its loads. */
  public rootsChanged(): void {
    const folders = this.store.all().map(rootOf);

    this.loads.rootsKept(new Set(folders));
  }

  public refreshAll(): void {
    this.loads.refreshAll();
  }

  public dispose(): void {
    this.loads.dispose();
  }

  /** Fires the cached umbrella nodes of the package's groups in one event; none cached (package never opened) fires nothing. */
  private changed(root: string, packageName: string): void {
    const { groups } = this.view(root, packageName);
    const umbrellaOf = (group: AtomGroup): TreeNode | undefined => this.cache.get(rowIdOf('task', root, group.umbrella.id));
    const nodes = groups.map(umbrellaOf).filter((node) => node !== undefined);

    if (nodes.length > 0) this.fire(nodes);
  }
}
