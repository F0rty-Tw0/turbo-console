import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { childRowsOf } from './node-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { TreeNode } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

const ROOT_PACKAGE_NODE: TreeNode = { kind: 'pkg', id: 'pkg:/ws\0//', root: '/ws', key: '//', packageName: '//' };

const CHECK_TASK: TaskNode = { ...TASK_NODE_STUB, id: '//#check', name: 'check', command: 'turbo run test' };

const TEST_SCRIPT: TaskNode = { ...TASK_NODE_STUB, id: '//#test', name: 'test', command: 'vitest', isTurboTask: false };

const ROOT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '.', tasks: [CHECK_TASK, TEST_SCRIPT] };

const stateOf = (singlePackage: boolean): RootState => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, singlePackage, packages: [ROOT_PACKAGE] };
  const state: RootState = { ...ROOT_STATE_STUB, model };

  return state;
};

const checkRowOf = (singlePackage: boolean): TreeRow | undefined => {
  const rows = childRowsOf(stateOf(singlePackage), ROOT_PACKAGE_NODE, rowContextOf('list'));

  return rows.find((row) => row.id === 'task:/ws\0//#check');
};

describe('FEATURE: the tool line of a // task row follows the model', () => {
  describe('GIVEN a // task running turbo run test next to a test script running vitest', () => {
    it('WHEN the model is a single package THEN the Tool line names Vitest via test', () => {
      const row = checkRowOf(true);

      expect(row?.tooltip).toContain('Tool: Vitest (via test)');
    });

    it('WHEN the model is a single package THEN the row carries the vitest config names', () => {
      const row = checkRowOf(true);

      expect(row?.themeFiles).toStrictEqual(['vitest.config.ts', 'vitest.config.js']);
    });

    it('WHEN the model is a monorepo THEN the row has no themeFiles', () => {
      const row = checkRowOf(false);

      expect(row).not.toHaveProperty('themeFiles');
    });

    it('WHEN the model is a monorepo THEN the row has no Tool line', () => {
      const row = checkRowOf(false);

      expect(row?.tooltip.some((line) => line.startsWith('Tool:'))).toBe(false);
    });
  });
});
