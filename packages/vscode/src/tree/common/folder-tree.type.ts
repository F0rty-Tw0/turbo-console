import type { WorkspaceModel } from '@turbo-console/core';

/** A directory node of the folders view; `path` is posix, relative to the root, and `label` may be a compressed `a/b`. */
export type FolderDir = {
  readonly path: string;
  readonly label: string;
  readonly dirs: FolderDir[];
  readonly packages: string[];
};

export type FolderTree = {
  readonly dirs: FolderDir[];
  readonly packages: string[];
};

/** A model's folder tree; `PackagesTree` answers it once per model object (`FolderTrees`). */
export type FolderTreeOf = (model: WorkspaceModel) => FolderTree;
