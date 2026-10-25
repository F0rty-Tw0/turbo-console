import type { TreeNode } from '../../common/tree-node.type.ts';
import { FILE_A, PKG, ROOT, UMBRELLA_ID } from '../common/atom-load.const.ts';

export const TREE_NODE_STUB: TreeNode = { kind: 'pkg', id: 'pkg:/ws\0a', root: '/ws', key: 'a', packageName: 'a' };

export const TASK_TREE_NODE_STUB: TreeNode = { kind: 'task', id: 'task:/ws\0build', root: '/ws', key: 'build', packageName: 'a' };

export const UMBRELLA_TREE_NODE_STUB: TreeNode = {
  kind: 'task',
  id: `task:${ROOT}\0${UMBRELLA_ID}`,
  root: ROOT,
  key: UMBRELLA_ID,
  packageName: PKG
};

export const FILE_TREE_NODE_STUB: TreeNode = { ...UMBRELLA_TREE_NODE_STUB, id: `task:${ROOT}\0${FILE_A}`, key: FILE_A };

export const PLAIN_TASK_TREE_NODE_STUB: TreeNode = { ...UMBRELLA_TREE_NODE_STUB, id: `task:${ROOT}\0a#build`, key: 'a#build' };
