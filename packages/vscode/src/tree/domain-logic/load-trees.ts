import { AffectedTree } from './affected-tree.ts';
import { AtomTree } from './atom-tree.ts';
import { PredictionTree } from './prediction-tree.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';

/** The shared loads the tree feeds (the Atomizer's, the cache prediction's, the affected tasks'): a model or roots event reaches each, a refresh event the first two (the affected tasks ask again on the reloaded model); a node or run event only the first two. */
export class LoadTrees {
  public readonly atoms: AtomTree;
  public readonly prediction: PredictionTree;
  public readonly affected: AffectedTree;

  public constructor(
    store: Roots,
    cache: ReadonlyMap<string, TreeNode>,
    ports: Pick<TreePorts, 'atom' | 'prediction' | 'affected' | 'fire'>
  ) {
    this.atoms = new AtomTree(store, cache, ports);
    this.prediction = new PredictionTree(store, cache, ports);
    this.affected = new AffectedTree(store, cache, ports);
  }

  public childrenRequested(node: TreeNode): void {
    this.atoms.childrenRequested(node);
    this.prediction.childrenRequested(node);
  }

  public runChanged(entry: RunEntry): void {
    this.atoms.runChanged(entry);
    this.prediction.runChanged(entry);
  }

  public modelChanged(change: RootChange): void {
    this.atoms.modelChanged(change);
    this.prediction.modelChanged(change);
    this.affected.modelChanged(change);
  }

  public rootsChanged(): void {
    this.atoms.rootsChanged();
    this.prediction.rootsChanged();
    this.affected.rootsChanged();
  }

  public refreshAll(): void {
    this.atoms.refreshAll();
    this.prediction.refreshAll();
    // Not the affected tree: the Refresh reloads every model, and each new model asks again; restarting here too would spawn a second query.
  }

  public dispose(): void {
    this.atoms.dispose();
    this.prediction.dispose();
    this.affected.dispose();
  }
}
