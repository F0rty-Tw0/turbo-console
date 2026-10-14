import type { WorkspaceModel } from '@turbo-console/core';

import type { FolderTree } from '../common/folder-tree.type.ts';
import { folderTree } from '../utils/folder-tree.util.ts';

/**
 * One folder tree per model object: in folders mode the editor asks for the children and the item of every folder
 * node, and each answer needs the tree, so it is built once per model instead of walking every package each time.
 */
export class FolderTrees {
  private readonly trees = new WeakMap<WorkspaceModel, FolderTree>();

  public of(model: WorkspaceModel): FolderTree {
    const cached = this.trees.get(model);

    if (cached !== undefined) return cached;

    const tree = folderTree(model.packages);

    this.trees.set(model, tree);

    return tree;
  }
}
