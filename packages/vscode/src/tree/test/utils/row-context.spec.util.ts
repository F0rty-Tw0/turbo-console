import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import type { LiveIds, RunLookup } from '../../../run/common/run.type.ts';
import type { AtomLookup } from '../../common/atom-view.type.ts';
import { NO_ATOMS } from '../../common/atom.const.ts';
import type { ModelView } from '../../common/model-view.type.ts';
import type { RowContext } from '../../common/tree-node.type.ts';
import type { TreeMode } from '../../common/tree-row.type.ts';
import { modelViewOf } from '../../utils/model-view.util.ts';
import type { ScriptsContext } from '../common/scripts-context.type.ts';
import { resolveLookupMock } from '../mocks/tool-lookup.mock.ts';
import { WORKSPACE_MODEL_STUB } from '../stubs/workspace-model.stub.ts';

const NO_ATOMS_LOOKUP: AtomLookup = () => NO_ATOMS;

const NEVER_RAN: RunLookup = () => undefined;

const NO_IDS: ReadonlySet<string> = new Set();

const NOTHING_LIVE: LiveIds = () => NO_IDS;

const SCRIPTS_HIDDEN: ScriptsContext = { scriptsShown: false, live: NOTHING_LIVE };

/** The wall clock every `rowContextOf` context reads: a run launched at `ROW_NOW - 12_345` has run `12s`. */
export const ROW_NOW = 1_000_000;

/** A row context whose views are built fresh on every call, so each row reads the model it is given. */
export const rowContextOf = (
  mode: TreeMode,
  runs: RunLookup = NEVER_RAN,
  scopeShown = false,
  scripts: ScriptsContext = SCRIPTS_HIDDEN
): RowContext => {
  const { scriptsShown, live } = scripts;
  const context: RowContext = {
    mode,
    runs,
    views: modelViewOf,
    scopeShown,
    scriptsShown,
    live,
    now: ROW_NOW,
    countsMemo: new WeakMap(),
    tools: resolveLookupMock(),
    atoms: NO_ATOMS_LOOKUP
  };

  return context;
};

export const modelViewWith = (packages: PackageNode[], scriptsShown = false, liveOfRoot: ReadonlySet<string> = NO_IDS): ModelView => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return modelViewOf(model, scriptsShown, liveOfRoot);
};
