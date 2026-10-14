import { WORKSPACE_MODEL_STUB } from './workspace-model.stub.ts';
import type { RootState } from '../../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../../roots/common/root.type.ts';

/** Roots-slice types stubbed here, not under `roots/test/stubs/`: the state carries the tree's own 3-package model. */
export const ROOT_FOLDER_STUB: RootFolder = { root: '/ws', name: 'ws' };

export const ROOT_STATE_STUB: RootState = {
  folder: ROOT_FOLDER_STUB,
  binary: null,
  model: WORKSPACE_MODEL_STUB,
  error: null
};
