import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import type { FolderTree } from './folder-tree.type.ts';

/**
 * What the tree shows of one model (spec §4.7): the packages with at least one visible task, in model order, their
 * folder tree, the cleaned label each reads while scopes are hidden (spec §4.8), and per directory path the shown packages
 * below it at any depth and per shown package its offered tasks (spec §4.9 tooltips). It does not depend on the scope
 * toggle; the scripts toggle and the live script runs decide which packages are shown (spec 1c-b §4.1).
 */
export type ModelView = {
  readonly packages: ReadonlyMap<string, PackageNode>;
  readonly folders: FolderTree;
  readonly bareTexts: ReadonlyMap<string, string>;
  readonly packagesBelow: ReadonlyMap<string, number>;
  readonly visibleTaskCounts: ReadonlyMap<string, number>;
};

/**
 * A model's view; `PackagesTree` answers it once per model object and view key (`ModelViews`). `liveOfRoot` is the
 * running task ids of the folder root the model belongs to, never of `model.root`.
 */
export type ModelViewsOf = (model: WorkspaceModel, scriptsShown: boolean, liveOfRoot: ReadonlySet<string>) => ModelView;
