import type { PackageNode } from '@turbo-console/core';
import type { GraphPackage } from '@turbo-console/webview-ui';

import { PACKAGE_NODE_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';

export const rootNode = (name: string, tags: string[] = []): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, tags };

  return node;
};

export const graphPackageOf = (name: string, path: string, tags: string[] = [], taskCount = 0): GraphPackage => {
  const info: GraphPackage = { name, path, tags, taskCount };

  return info;
};
