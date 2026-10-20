import { TurboException } from '@turbo-console/core';
import type { CachedWorkspace, PackageManager, PackageManagerSource, TurboBinary, WorkspaceModel } from '@turbo-console/core';

import type { LoadFailure, LoadedModel } from '../../common/root.type.ts';
import { loadFailureOf } from '../utils/load-failure.spec.util.ts';

const BINARY_FIELDS = {
  root: '/ws',
  path: '/ws/node_modules/.bin/turbo',
  version: '2.11.7',
  source: 'workspace'
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- core exports TurboBinary type-only and its #brand makes a literal unassignable; no production path builds one in a spec.
export const TURBO_BINARY_STUB: TurboBinary = BINARY_FIELDS as TurboBinary;

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
