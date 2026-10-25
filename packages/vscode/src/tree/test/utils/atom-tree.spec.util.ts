import type { WorkspaceModel } from '@turbo-console/core';

import type { LoadedModel } from '../../../roots/common/root.type.ts';
import { LOADED_MODEL_STUB } from '../../../roots/test/stubs/root.stub.ts';
import type { RunEntry } from '../../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../../run/test/stubs/run.stub.ts';
import type { TreeNode } from '../../common/tree-node.type.ts';
import { FILE_A, PKG, ROOT, UMBRELLA_ID } from '../common/atom-load.const.ts';
import type { ChildrenOf } from '../common/atom-load.type.ts';

/** A load result of `model` with the stub turbo binary, so the root can start Atomizer loads. */
export const loadedOf = (model: WorkspaceModel): LoadedModel => {
  const loaded: LoadedModel = { ...LOADED_MODEL_STUB, model };

  return loaded;
};

/** The cached load of `model` as a reload publishes it first: read from the cache before the turbo binary resolved. */
export const cachedOf = (model: WorkspaceModel): LoadedModel => {
  const cached: LoadedModel = { ...LOADED_MODEL_STUB, binary: null, model, fromCache: true, isFresh: false };

  return cached;
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

/** Opens `node` and every row under it, as a user expanding the whole tree would. */
export const expandAll = async (children: ChildrenOf, node?: TreeNode): Promise<void> => {
  const rows = await children(node);
  const walks = rows.map(async (row) => expandAll(children, row));

  await Promise.all(walks);
};

/** The run of `FILE_A` in `PKG` with `patch` applied. */
export const runOf = (patch: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, root: ROOT, taskId: FILE_A, packageName: PKG, ...patch };

  return entry;
};
