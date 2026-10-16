import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import { dirRow, dirRows, packageRow } from './dir-rows.util.ts';
import { liveOf } from './live-of.util.ts';
import { rootRowOf, rootRows, shownModelOf } from './root-rows.util.ts';
import { rowScopeOf } from './row-scope.util.ts';
import { groupRowOf, scriptRows } from './script-rows.util.ts';
import { taskRowOf, taskRows } from './task-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { LABEL_MAX } from '../../shared/common/text.const.ts';
import { cleanText } from '../../shared/utils/clean-text.util.ts';
import type { FolderDir, FolderTree } from '../common/folder-tree.type.ts';
import { LOADING_ICON } from '../common/icon.const.ts';
import type { ModelView } from '../common/model-view.type.ts';
import type { RowContext, TreeNode } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';

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
  const view = context.views(model, context.scriptsShown, liveOf(context, root));
  const pkg = packageOf(view, node.packageName);
  const scope = rowScopeOf(root, model);

  if (node.kind === 'pkg' && pkg !== undefined) return taskRows(scope, pkg, context);

  if (node.kind === 'scripts' && pkg !== undefined) return scriptRows(scope, pkg, context);

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
  const view = context.views(model, context.scriptsShown, liveOf(context, root));
  const dir = dirOf(view, node);

  if (dir !== undefined) return dirRow(root, dir, view);

  const pkg = packageOf(view, node.packageName);

  if (pkg === undefined) return undefined;

  if (node.kind === 'pkg') return packageRow(root, pkg, view, context.scopeShown);

  const scope = rowScopeOf(root, model);

  if (node.kind === 'scripts') return groupRowOf(scope, pkg, context) ?? undefined;

  return taskRowOf(scope, pkg, node.key, context);
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
