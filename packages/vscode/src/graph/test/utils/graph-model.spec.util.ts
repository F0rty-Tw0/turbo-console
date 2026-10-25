import type { PackageNode, TaskNode } from '@turbo-console/core';
import type { GraphPackage } from '@turbo-console/webview-ui';

import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';

export const rootNode = (name: string, tags: string[] = []): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, tags };

  return node;
};

export const graphPackageOf = (name: string, path: string, tags: string[] = [], taskCount = 0): GraphPackage => {
  const info: GraphPackage = { name, path, tags, taskCount };

  return info;
};

/** The umbrella and the one file task of a `smoke` Atomizer group in `packageName`. */
export const smokeGroupTasksOf = (packageName: string): [TaskNode, TaskNode] => {
  const atom: NonNullable<TaskNode['atom']> = { group: 'smoke', isLive: false };
  const umbrella: TaskNode = {
    ...TASK_NODE_STUB,
    id: `${packageName}#smoke`,
    name: 'smoke',
    kind: 'atom-umbrella',
    atom
  };
  const file: TaskNode = {
    ...TASK_NODE_STUB,
    id: `${packageName}#smoke--x.spec.ts`,
    name: 'smoke--x.spec.ts',
    kind: 'atom-file',
    atom
  };
  const tasks: [TaskNode, TaskNode] = [umbrella, file];

  return tasks;
};
