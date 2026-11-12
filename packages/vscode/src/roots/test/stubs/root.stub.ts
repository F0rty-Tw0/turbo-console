import { TurboException } from '@turbo-console/core';
import type { CachedWorkspace, PackageManager, PackageManagerSource, TurboBinary, WorkspaceModel } from '@turbo-console/core';

import type { LoadFailure, LoadedModel } from '../../common/root.type.ts';
import { loadFailureOf } from '../utils/load-failure.spec.util.ts';
import { turboBinaryAt } from '../utils/turbo-binary.spec.util.ts';

export const TURBO_BINARY_STUB: TurboBinary = turboBinaryAt('/ws/node_modules/.bin/turbo');

const FIELD_SOURCE_STUB: PackageManagerSource = { kind: 'field' };

const PACKAGE_MANAGER_STUB: PackageManager = { name: 'pnpm', source: FIELD_SOURCE_STUB };

export const WORKSPACE_MODEL_STUB: WorkspaceModel = {
  root: '/ws',
  turboVersion: '2.11.7',
  packageManager: PACKAGE_MANAGER_STUB,
  affectedMode: 'package',
  singlePackage: false,
  packages: [],
  edges: [],
  warnings: []
};

export const CACHED_WORKSPACE_STUB: CachedWorkspace = {
  model: WORKSPACE_MODEL_STUB,
  isFresh: async (): Promise<boolean> => Promise.resolve(true)
};

export const STALE_CACHED_WORKSPACE_STUB: CachedWorkspace = {
  ...CACHED_WORKSPACE_STUB,
  isFresh: async (): Promise<boolean> => Promise.resolve(false)
};

export const LOADED_MODEL_STUB: LoadedModel = {
  kind: 'model',
  binary: TURBO_BINARY_STUB,
  model: WORKSPACE_MODEL_STUB,
  fromCache: false,
  isFresh: true
};

const NOT_FOUND = new TurboException('not-found', 'no turbo');

export const LOAD_FAILURE_STUB: LoadFailure = loadFailureOf('binary', NOT_FOUND);
