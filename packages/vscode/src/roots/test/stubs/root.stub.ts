import type { CachedWorkspace, TurboBinary, WorkspaceModel } from '@turbo-console/core';

const BINARY_FIELDS = {
  root: '/ws',
  path: '/ws/node_modules/.bin/turbo',
  version: '2.11.7',
  source: 'workspace'
};

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- core exports TurboBinary type-only and its #brand makes a literal unassignable; no production path builds one in a spec.
export const TURBO_BINARY_STUB: TurboBinary = BINARY_FIELDS as TurboBinary;

export const WORKSPACE_MODEL_STUB: WorkspaceModel = {
  root: '/ws',
  turboVersion: '2.11.7',
  affectedMode: 'package',
  packages: [],
  edges: [],
  warnings: []
};

export const CACHED_WORKSPACE_STUB: CachedWorkspace = {
  model: WORKSPACE_MODEL_STUB,
  isFresh: true
};
