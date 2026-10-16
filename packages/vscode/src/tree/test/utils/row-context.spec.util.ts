import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import type { RunLookup } from '../../../run/common/run.type.ts';
import type { ModelView } from '../../common/model-view.type.ts';
import type { RowContext } from '../../common/tree-node.type.ts';
import type { TreeMode } from '../../common/tree-row.type.ts';
import { modelViewOf } from '../../utils/model-view.util.ts';
import { WORKSPACE_MODEL_STUB } from '../stubs/workspace-model.stub.ts';

const NEVER_RAN: RunLookup = () => undefined;

/** The wall clock every `rowContextOf` context reads: a run launched at `ROW_NOW - 12_345` has run `12s`. */
export const ROW_NOW = 1_000_000;

/** A row context whose views are built fresh on every call, so each row reads the model it is given. */
export const rowContextOf = (mode: TreeMode, runs: RunLookup = NEVER_RAN, scopeShown = false): RowContext => {
  const context: RowContext = { mode, runs, views: modelViewOf, scopeShown, now: ROW_NOW };

  return context;
};

export const modelViewWith = (packages: PackageNode[]): ModelView => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return modelViewOf(model);
};
