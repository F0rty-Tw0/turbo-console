import type { WorkspaceModel } from '@turbo-console/core';

import type { LoadedModel } from '../../../roots/common/root.type.ts';
import { LOADED_MODEL_STUB } from '../../../roots/test/stubs/root.stub.ts';
import type { TreeNode } from '../../common/tree-node.type.ts';
import { PKG, UMBRELLA_ID } from '../common/atom-loads.const.ts';
import type { ChildrenOf } from '../common/atom-loads.type.ts';

/** A load result of `model` with the stub turbo binary, so the root can start Atomizer loads. */
export const loadedOf = (model: WorkspaceModel): LoadedModel => {
  const loaded: LoadedModel = { ...LOADED_MODEL_STUB, model };

  return loaded;
};

/** The node of `nodes` with `key`; a spec whose row is missing fails here, by name. */
export const nodeKeyed = (nodes: TreeNode[], key: string): TreeNode => {
  const found = nodes.find((node) => node.key === key);

  if (found === undefined) throw new Error(`no node ${key}`);

  return found;
};

/** The umbrella node of group `e2e-ci` as VS Code gets it: the package row listed, then opened. */
export const umbrellaNodeOf = async (children: ChildrenOf): Promise<TreeNode> => {
  const packages = await children();
  const tasks = await children(nodeKeyed(packages, PKG));

  return nodeKeyed(tasks, UMBRELLA_ID);
};
