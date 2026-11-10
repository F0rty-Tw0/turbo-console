import { AtomTree } from './atom-tree.ts';
import { PredictionTree } from './prediction-tree.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';

/** Both shared loads the tree feeds (the Atomizer's and the cache prediction's): each event reaches `atoms` and `prediction` alike. */
export class LoadTrees {
  public readonly atoms: AtomTree;
  public readonly prediction: PredictionTree;

  public constructor(store: Roots, cache: ReadonlyMap<string, TreeNode>, ports: Pick<TreePorts, 'atom' | 'prediction' | 'fire'>) {
    this.atoms = new AtomTree(store, cache, ports);
    this.prediction = new PredictionTree(store, cache, ports);
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
  }

  public rootsChanged(): void {
    this.atoms.rootsChanged();
    this.prediction.rootsChanged();
  }

  public refreshAll(): void {
    this.atoms.refreshAll();
    this.prediction.refreshAll();
  }

  public dispose(): void {
    this.atoms.dispose();
    this.prediction.dispose();
  }
}
