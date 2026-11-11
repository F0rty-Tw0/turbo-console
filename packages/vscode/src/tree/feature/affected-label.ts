import type { Disposable, TreeView } from 'vscode';

import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { TreeContext } from '../common/tree-context.type.ts';
import type { PackagesTreeApi, TreeNode } from '../common/tree-node.type.ts';
import { affectedLabelOf } from '../utils/affected-label.util.ts';

/**
 * Writes the view description (spec §3 Mode label) once now and again on the affected toggle, on every store change and on
 * every tree redraw: a root added or removed redraws the tree and fires no store change, so a Failed root that left the
 * window would otherwise keep the label.
 */
export const followAffectedLabel = (
  view: Pick<TreeView<TreeNode>, 'description'>,
  context: Pick<TreeContext, 'affected' | 'affectedLoads'>,
  tree: Pick<PackagesTreeApi, 'onDidChangeTreeData'>,
  store: Roots
): Disposable => {
  const { affected, affectedLoads } = context;
  const write = (): void => {
    const roots = store.all().map((entry) => entry.state.folder.root);

    view.description = affectedLabelOf(affected.isShown(), roots, affectedLoads);
  };

  write();

  const unsubscribeToggle = affected.onDidChange(write);
  const unsubscribeStore = affectedLoads.onDidChange(write);
  const treeSubscription = tree.onDidChangeTreeData(write);
  const following: Disposable = {
    dispose: () => {
      unsubscribeToggle();
      unsubscribeStore();
      treeSubscription.dispose();
    }
  };

  return following;
};
