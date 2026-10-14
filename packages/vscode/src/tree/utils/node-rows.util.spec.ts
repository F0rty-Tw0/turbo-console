import { TurboException } from '@turbo-console/core';
import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { allRows } from './all-rows.util.ts';
import { folderTree } from './folder-tree.util.ts';
import { nodeFor } from './node-cache.util.ts';
import { childRowsOf, currentRowOf } from './node-rows.util.ts';
import { rootNodeRow } from './root-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { LoadFailure } from '../../roots/common/root.type.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { FolderTreeOf } from '../common/folder-tree.type.ts';
import { LOADING_ICON } from '../common/icon.const.ts';
import { MESSAGE_TEXTS } from '../common/message.const.ts';
import type { RowContext, TreeNode } from '../common/tree-node.type.ts';
import type { TreeMode, TreeRow } from '../common/tree-row.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';

const NO_RUNS: RunLookup = () => undefined;

const RUNNING: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'build' };

const runningBuild: RunLookup = (_root, taskId) => (taskId === 'build' ? RUNNING : undefined);

const ROOT_NODE: TreeNode = { kind: 'root', id: 'root:/ws', root: '/ws', key: '/ws', packageName: null };

const PACKAGES_DIR_NODE: TreeNode = { kind: 'dir', id: 'dir:/ws\0packages', root: '/ws', key: 'packages', packageName: null };

const LIBS_DIR_NODE: TreeNode = { ...PACKAGES_DIR_NODE, id: 'dir:/ws\0packages/libs', key: 'packages/libs' };

const TASK_NODE: TreeNode = { kind: 'task', id: 'task:/ws\0build', root: '/ws', key: 'build', packageName: 'a' };

const MSG_NODE: TreeNode = { kind: 'msg', id: 'msg:/ws\0load-no-model', root: '/ws', key: 'load-no-model', packageName: null };

const GONE_NODE: TreeNode = { ...TREE_NODE_STUB, id: 'pkg:/ws\0gone', key: 'gone', packageName: 'gone' };

const BINARY_FAILURE: LoadFailure = { kind: 'error', stage: 'binary', error: new TurboException('not-found', 'x') };

const LOAD_FAILURE: LoadFailure = { kind: 'error', stage: 'load', error: new TurboException('failed', 'x') };

const FOLDER_TREE_OF: FolderTreeOf = (model) => folderTree(model.packages);

const FOLDERS_VIEW: RowContext = { mode: 'folders', runs: NO_RUNS, folders: FOLDER_TREE_OF };

const RUNNING_VIEW: RowContext = { ...FOLDERS_VIEW, runs: runningBuild };

const TEST_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'test', name: 'test' };

const TWO_TASK_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [TASK_NODE_STUB, TEST_TASK] };

const TWO_TASK_MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [TWO_TASK_PACKAGE] };

const TEST_TASK_NODE: TreeNode = { kind: 'task', id: 'task:/ws\0test', root: '/ws', key: 'test', packageName: 'a' };

const EMPTY_MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [] };

const PARITY_STATES: [string, RootState][] = [
  ['a model', ROOT_STATE_STUB],
  ['a model with no packages', { ...ROOT_STATE_STUB, model: EMPTY_MODEL }],
  ['a load error over a kept model', { ...ROOT_STATE_STUB, error: LOAD_FAILURE }],
  ['a binary error over a kept model', { ...ROOT_STATE_STUB, error: BINARY_FAILURE }],
  ['a load error and no model', { ...ROOT_STATE_STUB, model: null, error: LOAD_FAILURE }],
  ['nothing loaded yet', { ...ROOT_STATE_STUB, model: null }]
];

const MODES: TreeMode[] = ['folders', 'list'];

const idsOf = (rows: TreeRow[]): string[] => rows.map((row) => row.id);

/** The row `getTreeItem` builds for the node `getChildren` made of `row`. */
const rebuiltOf = (state: RootState, row: TreeRow, mode: TreeMode): TreeRow => {
  const node = nodeFor(new Map(), row);
  const context: RowContext = { ...RUNNING_VIEW, mode };

  return currentRowOf(state, node, context);
};

describe('FEATURE: node rows', () => {
  describe('GIVEN a root showing a three-package model in folders mode', () => {
    it('WHEN the root node is opened THEN it lists the top-level folders', () => {
      const rows = childRowsOf(ROOT_STATE_STUB, ROOT_NODE, FOLDERS_VIEW);

      expect(idsOf(rows)).toStrictEqual(['dir:/ws\0apps', 'dir:/ws\0packages']);
    });

    it('WHEN a folder is opened THEN it lists its folders, then its packages', () => {
      const rows = childRowsOf(ROOT_STATE_STUB, PACKAGES_DIR_NODE, FOLDERS_VIEW);

      expect(idsOf(rows)).toStrictEqual(['dir:/ws\0packages/libs', 'pkg:/ws\0a']);
    });

    it('WHEN a folder the model lacks is opened THEN it lists nothing', () => {
      const node: TreeNode = { ...PACKAGES_DIR_NODE, id: 'dir:/ws\0nope', key: 'nope' };

      const rows = childRowsOf(ROOT_STATE_STUB, node, FOLDERS_VIEW);

      expect(rows).toStrictEqual([]);
    });

    it('WHEN a package is opened THEN it lists its tasks', () => {
      const rows = childRowsOf(ROOT_STATE_STUB, TREE_NODE_STUB, FOLDERS_VIEW);

      expect(idsOf(rows)).toStrictEqual(['task:/ws\0build']);
    });

    it('WHEN a package the model lacks is opened THEN it lists nothing', () => {
      const rows = childRowsOf(ROOT_STATE_STUB, GONE_NODE, FOLDERS_VIEW);

      expect(rows).toStrictEqual([]);
    });

    it('WHEN a task is opened THEN it lists nothing', () => {
      const rows = childRowsOf(ROOT_STATE_STUB, TASK_NODE, FOLDERS_VIEW);

      expect(rows).toStrictEqual([]);
    });

    it("WHEN the root node's current row is built THEN it carries the folder name", () => {
      const row = currentRowOf(ROOT_STATE_STUB, ROOT_NODE, FOLDERS_VIEW);

      expect(row.label).toBe('ws');
    });

    it("WHEN a folder's current row is built THEN it carries its label", () => {
      const row = currentRowOf(ROOT_STATE_STUB, LIBS_DIR_NODE, FOLDERS_VIEW);

      expect(row.label).toBe('libs');
    });

    it("WHEN a package's current row is built THEN it carries its path", () => {
      const row = currentRowOf(ROOT_STATE_STUB, TREE_NODE_STUB, FOLDERS_VIEW);

      expect(row.description).toBe('packages/a');
    });

    it("WHEN a task's current row is built THEN it carries its run state", () => {
      const row = currentRowOf(ROOT_STATE_STUB, TASK_NODE, RUNNING_VIEW);

      expect(row.description).toBe('running…');
    });

    it('WHEN a gone package row is built THEN a loading row stands in under its id', () => {
      const row = currentRowOf(ROOT_STATE_STUB, GONE_NODE, FOLDERS_VIEW);

      expect([row.id, row.label, row.icon]).toStrictEqual(['pkg:/ws\0gone', 'gone', LOADING_ICON]);
    });
  });

  describe('GIVEN a root in a binary error over a shown model', () => {
    const state: RootState = { ...ROOT_STATE_STUB, error: BINARY_FAILURE };

    it('WHEN a package is opened THEN it lists nothing', () => {
      const rows = childRowsOf(state, TREE_NODE_STUB, FOLDERS_VIEW);

      expect(rows).toStrictEqual([]);
    });
  });

  describe('GIVEN a root with no model and a load error', () => {
    const state: RootState = { ...ROOT_STATE_STUB, model: null, error: LOAD_FAILURE };

    it('WHEN a folder is opened THEN it lists nothing', () => {
      const rows = childRowsOf(state, PACKAGES_DIR_NODE, FOLDERS_VIEW);

      expect(rows).toStrictEqual([]);
    });

    it("WHEN the message's current row is built THEN it carries the message text", () => {
      const row = currentRowOf(state, MSG_NODE, FOLDERS_VIEW);

      expect(row.label).toBe(MESSAGE_TEXTS['load-no-model']);
    });
  });

  describe('GIVEN a package with two tasks', () => {
    const state: RootState = { ...ROOT_STATE_STUB, model: TWO_TASK_MODEL };

    it("WHEN the second task's current row is built THEN it is that task's row", () => {
      const row = currentRowOf(state, TEST_TASK_NODE, FOLDERS_VIEW);

      expect(row.label).toBe('test');
    });
  });

  describe.each(PARITY_STATES)('GIVEN a root showing %s', (_name, state) => {
    it.each(MODES)('WHEN every listed row is rebuilt from its node in %s mode THEN each equals the listed row', (mode) => {
      const listed = allRows(state, mode, runningBuild);
      const rebuilt = listed.map((row) => rebuiltOf(state, row, mode));

      expect(rebuilt).toStrictEqual(listed);
    });

    it('WHEN its node in a multi-root window is rebuilt THEN it equals the listed root row', () => {
      const listed = rootNodeRow(state.folder);
      const rebuilt = rebuiltOf(state, listed, 'folders');

      expect(rebuilt).toStrictEqual(listed);
    });
  });
});
