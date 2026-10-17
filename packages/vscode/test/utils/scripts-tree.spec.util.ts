import { packageNodes } from './tree-polish-tree.spec.util.ts';
import { packageNodeNamed } from './tree-walk.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';

const isGroup = (node: TreeNode): boolean => node.kind === 'scripts';

/** The names of every package the tree lists, in tree order. */
export const listedPackages = async (api: TurboConsoleApi): Promise<string[]> => {
  const nodes = await packageNodes(api);

  return nodes.map((node) => node.key);
};

/** The `Scripts` group under package `name`, or `undefined` while the package holds none. */
export const scriptsGroupOf = async (api: TurboConsoleApi, name: string): Promise<TreeNode | undefined> => {
  const pkg = await packageNodeNamed(api, name);
  const children = await api.tree.getChildren(pkg);

  return children.find(isGroup);
};

/** The task ids of the rows under package `name`'s `Scripts` group; none without a group. */
export const scriptKeysOf = async (api: TurboConsoleApi, name: string): Promise<string[]> => {
  const group = await scriptsGroupOf(api, name);

  if (group === undefined) return [];

  const rows = await api.tree.getChildren(group);

  return rows.map((row) => row.key);
};

/** The cached node of script `taskId` under package `name`'s `Scripts` group. */
export const scriptNodeNamed = async (api: TurboConsoleApi, name: string, taskId: string): Promise<TreeNode> => {
  const group = await scriptsGroupOf(api, name);

  if (group === undefined) throw new Error(`${name} shows no Scripts group`);

  const rows = await api.tree.getChildren(group);
  const node = rows.find((row) => row.key === taskId);

  if (node === undefined) throw new Error(`${name} shows no script ${taskId}`);

  return node;
};
