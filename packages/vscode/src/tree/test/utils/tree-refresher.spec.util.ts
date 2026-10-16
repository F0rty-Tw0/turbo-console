import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { vi } from 'vitest';

import { rowContextOf } from './row-context.spec.util.ts';
import { packageNamed } from './tree-model.spec.util.ts';
import type { RootEntry, RootState, Roots } from '../../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../../roots/common/root.type.ts';
import { coordinatorMock } from '../../../roots/test/mocks/coordinator.mock.ts';
import type { LiveIds, RunEntry } from '../../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../../run/test/stubs/run.stub.ts';
import { scriptsToggleMock } from '../../../shared/test/mocks/scripts-toggle.mock.ts';
import type { RowContext, TreeNode } from '../../common/tree-node.type.ts';
import type { RefreshDeps } from '../../common/tree-refresh.type.ts';
import { allRows } from '../../utils/all-rows.util.ts';
import { nodesOf } from '../../utils/node-cache.util.ts';
import { rootRowOf } from '../../utils/root-rows.util.ts';
import type { RefresherFixture } from '../common/refresher-fixture.type.ts';
import { TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../stubs/workspace-model.stub.ts';

const NOBODY: ReadonlySet<string> = new Set();

/** The script `s#lint`, defined by a `package.json` only: a turbo task never moves the root. */
export const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, id: 's#lint', name: 'lint', isTurboTask: false };

export const SCRIPT_PACKAGE: PackageNode = { name: 's', path: 'packages/s', tags: [], tasks: [SCRIPT_TASK] };

const entryOf = (folder: RootFolder): RootEntry => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [packageNamed('a'), SCRIPT_PACKAGE] };
  const state: RootState = { folder, binary: null, model, error: null };
  const entry: RootEntry = { state, coordinator: coordinatorMock() };

  return entry;
};

const rootsOf = (entries: RootEntry[]): Roots => {
  const get = (root: string): RootEntry | undefined => entries.find((entry) => entry.state.folder.root === root);
  const roots: Roots = { get, all: () => entries, onDidChange: () => () => undefined };

  return roots;
};

/** Roots `/ws` and, with `multi`, `/other`; each holds turbo package `a` and package `s` with the one script. */
export const refresherFixtureOf = (multi = false): RefresherFixture => {
  const folders: RootFolder[] = [{ root: '/ws', name: 'ws' }];

  if (multi) folders.push({ root: '/other', name: 'other' });

  const entries = folders.map(entryOf);
  const store = rootsOf(entries);
  const cache = new Map<string, TreeNode>();
  const live = new Map<string, ReadonlySet<string>>();
  const toggle = scriptsToggleMock(false);
  const fire = vi.fn<RefreshDeps['fire']>();
  const liveOf: LiveIds = (root) => live.get(root) ?? NOBODY;
  const rowContext = (): RowContext => rowContextOf('list', undefined, false, { scriptsShown: toggle.isShown(), live: liveOf });
  const show = (): void => {
    for (const entry of store.all()) {
      nodesOf(cache, allRows(entry.state, rowContext()));

      if (multi) nodesOf(cache, [rootRowOf(entry.state, rowContext())]);
    }
  };

  const deps: RefreshDeps = { store, cache, fire, rowContext };
  const fixture: RefresherFixture = { deps, fire, cache, live, toggle, show };

  return fixture;
};

/** A change of the script's run in `root`, as the run store emits it; `patch` sets what the case changes. */
export const scriptRunOf = (root: string, patch: Partial<RunEntry> = {}): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, root, taskId: SCRIPT_TASK.id, packageName: 's', task: SCRIPT_TASK, ...patch };

  return entry;
};
