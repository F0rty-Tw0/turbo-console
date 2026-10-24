import { WORKSPACE_MODEL_STUB } from '../../../cache/test/stubs/cache.stub.ts';
import type { PackageNode, TaskNode, WorkspaceModel } from '../../common/workspace-model.type.ts';
import { atomGroupsOf } from '../../utils/atom-groups.util.ts';

export const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { name, path: `packages/${name}`, label: null, tags: [], tasks };

  return pkg;
};

export const modelOf = (packages: PackageNode[]): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return model;
};

/** The `specPath` of every file of every group of `model`, in group order. */
export const specPathsOf = (model: WorkspaceModel): string[] => {
  const files = atomGroupsOf(model).flatMap((group) => group.files);

  return files.map((file) => file.specPath);
};
