import type { PackageNode } from '@turbo-console/core';

import { PACKAGE_NODE_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';

export const rootNode = (name: string): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name };

  return node;
};

export const taggedNode = (name: string, tags: string[]): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, tags };

  return node;
};
