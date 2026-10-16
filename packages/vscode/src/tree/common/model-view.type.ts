import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import type { FolderTree } from './folder-tree.type.ts';

/**
 * What the tree shows of one model (spec §4.7): the packages with at least one visible task, in model order, their
 * folder tree, the label each reads while scopes are hidden (spec §4.8), and per directory path the shown packages
 * below it at any depth (spec §4.9 tooltips). It does not depend on the scope toggle.
 */
export type ModelView = {
  readonly packages: ReadonlyMap<string, PackageNode>;
  readonly folders: FolderTree;
  readonly bareLabels: ReadonlyMap<string, string>;
  readonly packagesBelow: ReadonlyMap<string, number>;
};

/** A model's view; `PackagesTree` answers it once per model object (`ModelViews`). */
export type ModelViewsOf = (model: WorkspaceModel) => ModelView;
