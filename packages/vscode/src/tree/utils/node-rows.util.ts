import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import { dirRow, dirRows, packageRow } from './dir-rows.util.ts';
import { shownLabelOf } from './model-view.util.ts';
import { rootRowOf, rootRows } from './root-rows.util.ts';
import { taskRows } from './task-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import type { FolderDir, FolderTree } from '../common/folder-tree.type.ts';
import { LOADING_ICON } from '../common/icon.const.ts';
import type { ModelView } from '../common/model-view.type.ts';
import type { RowContext, TreeNode } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';

/** Behind a binary error no package or folder row is shown (spec §4.4), so none of them has children or a row. */
const shownModelOf = (state: RootState): WorkspaceModel | null => {
  if (state.error?.stage === 'binary') return null;

  return state.model;
};

/** A hidden package has no row (spec §4.7), so its stale node reads as gone. */
const packageOf = (view: ModelView, name: string | null): PackageNode | undefined => {
  if (name === null) return undefined;

  return view.packages.get(name);
};

const dirAt = (level: FolderTree, path: string): FolderDir | undefined => {
  for (const dir of level.dirs) {
    if (dir.path === path) return dir;

    const nested = dirAt(dir, path);

    if (nested !== undefined) return nested;
  }

  return undefined;
};

const dirOf = (view: ModelView, node: TreeNode): FolderDir | undefined => {
  if (node.kind !== 'dir') return undefined;

  return dirAt(view.folders, node.key);
};

const modelChildren = (root: string, model: WorkspaceModel, node: TreeNode, context: RowContext): TreeRow[] => {
  const view = context.views(model);
  const pkg = packageOf(view, node.packageName);

  if (node.kind === 'pkg' && pkg !== undefined) return taskRows(root, pkg, context);

  const dir = dirOf(view, node);

  if (dir === undefined) return [];

  return dirRows(root, dir, view, context.scopeShown);
};

/** The rows under `node` in the root's current state: a root's top level, a folder's level or a package's tasks. */
export const childRowsOf = (state: RootState, node: TreeNode, context: RowContext): TreeRow[] => {
  if (node.kind === 'root') return rootRows(state, context);

  const model = shownModelOf(state);

  if (model === null) return [];

  return modelChildren(state.folder.root, model, node, context);
};

/** A stand-in for a node the root no longer has: the tree is about to redraw, so it reads as loading and has no actions. */
export const goneRowOf = (node: TreeNode): TreeRow => {
  const row: TreeRow = {
    ...node,
    label: cleanText(node.key, LABEL_MAX),
    description: '',
    icon: LOADING_ICON,
    contextValue: '',
    collapsible: 'none',
    tooltip: [],
    command: null
  };

  return row;
};

const modelRow = (root: string, model: WorkspaceModel, node: TreeNode, context: RowContext): TreeRow | undefined => {
  const isId = (row: TreeRow): boolean => row.id === node.id;
  const view = context.views(model);
  const dir = dirOf(view, node);

  if (dir !== undefined) return dirRow(root, dir, view);

  const pkg = packageOf(view, node.packageName);

  if (pkg === undefined) return undefined;

  const label = shownLabelOf(view, pkg, context.scopeShown);

  if (node.kind === 'pkg') return packageRow(root, pkg, label);

  const tasks = taskRows(root, pkg, context);

  return tasks.find(isId);
};

const messageRowOf = (state: RootState, node: TreeNode, context: RowContext): TreeRow | undefined => {
  if (node.kind !== 'msg') return undefined;

  const top = rootRows(state, context);

  return top.find((row) => row.id === node.id);
};

const foundRowOf = (state: RootState, node: TreeNode, context: RowContext): TreeRow | undefined => {
  if (node.kind === 'root') return rootRowOf(state, context);

  const message = messageRowOf(state, node, context);
  const model = shownModelOf(state);

  if (message !== undefined || model === null) return message;

  return modelRow(state.folder.root, model, node, context);
};

/** `node`'s row rebuilt from the root's current state and runs, or a loading stand-in when the root no longer has it. */
export const currentRowOf = (state: RootState, node: TreeNode, context: RowContext): TreeRow => {
  const found = foundRowOf(state, node, context);

  if (found !== undefined) return found;

  return goneRowOf(node);
};
