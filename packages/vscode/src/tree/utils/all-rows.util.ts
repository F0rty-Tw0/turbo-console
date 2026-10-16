import { dirRows } from './dir-rows.util.ts';
import { rootRows } from './root-rows.util.ts';
import { taskRows } from './task-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { FolderDir, FolderTree } from '../common/folder-tree.type.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { TreeMode, TreeRow } from '../common/tree-row.type.ts';

const withDescendants = (dir: FolderDir): FolderDir[] => {
  const nested = dir.dirs.flatMap(withDescendants);

  return [dir, ...nested];
};

/** Every directory below the top level, in tree order; the list view has none. */
const dirsBelow = (tree: FolderTree, mode: TreeMode): FolderDir[] => {
  if (mode === 'list') return [];

  return tree.dirs.flatMap(withDescendants);
};

/**
 * The top level plus every directory's and package's children, for the bench: what a user sees after expanding
 * everything. Without a model, or behind a binary error, only the top level exists. A multi-root window's `root:` row
 * (`rootNodeRow`) is not included: a caller keeping a root's ids adds it.
 */
export const allRows = (state: RootState, context: RowContext): TreeRow[] => {
  const top = rootRows(state, context);
  const { model, error } = state;
  const hasPackages = model !== null && error?.stage !== 'binary';

  if (!hasPackages) return top;

  const { root } = state.folder;
  const view = context.views(model);
  const dirs = dirsBelow(view.folders, context.mode);
  const dirChildren = dirs.flatMap((dir) => dirRows(root, dir, view, context.scopeShown));
  const shown = Array.from(view.packages.values());
  const tasks = shown.flatMap((pkg) => taskRows(root, pkg, context));

  return [...top, ...dirChildren, ...tasks];
};
