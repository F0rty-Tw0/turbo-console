import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { modelTaskOf, runRequestOf, taskIdsOf, taskTargetOf } from './run-target.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { TASK_TREE_NODE_STUB, TREE_NODE_STUB } from '../../tree/test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { RunDefinition, RunRequest, TaskTarget } from '../common/run.type.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const TARGET: TaskTarget = { definition: RUN, packageName: 'a' };

const OTHER_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'web#build', command: 'vite build' };

const OTHER_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: 'web', path: 'apps/web', tasks: [OTHER_TASK] };

/** Package a comes second, so a lookup that takes the first package finds no task `build`. */
const TWO_PACKAGES: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [OTHER_PACKAGE, PACKAGE_NODE_STUB] };

const LOADED: RootState = { ...ROOT_STATE_STUB, binary: TURBO_BINARY_STUB, model: TWO_PACKAGES };

const TEST_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'a#test', name: 'test' };

const TWO_TASKS: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [TASK_NODE_STUB, TEST_TASK] };

const MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [TWO_TASKS] };

const NO_MODEL: RootState = { ...LOADED, model: null };

const NO_PACKAGES: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [] };

const NO_PACKAGE: RootState = { ...LOADED, model: NO_PACKAGES };

const NO_TASKS: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [] };

const NO_TASKS_MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [NO_TASKS] };

const NO_TASK: RootState = { ...LOADED, model: NO_TASKS_MODEL };

describe('FEATURE: run targets', () => {
  describe('GIVEN a command argument', () => {
    it('WHEN it is a task node THEN its target is the task of its package in its root', () => {
      const target = taskTargetOf(TASK_TREE_NODE_STUB);

      expect(target).toStrictEqual(TARGET);
    });

    it.each<[string, unknown]>([
      ['a package node', TREE_NODE_STUB],
      ['missing', undefined],
      ['not an object', 'task:/ws\0build'],
      ['a task node with no package', { ...TASK_TREE_NODE_STUB, packageName: null }],
      ['a task node whose root is not a string', { ...TASK_TREE_NODE_STUB, root: 7 }],
      ['a task node whose key is not a string', { ...TASK_TREE_NODE_STUB, key: ['build'] }]
    ])('WHEN it is %s THEN it targets no task', (_name, value) => {
      const target = taskTargetOf(value);

      expect(target).toBeNull();
    });
  });

  describe('GIVEN the target task of package a in a model', () => {
    it('WHEN its root holds the task THEN the model task is found, binary or not', () => {
      const task = modelTaskOf(TARGET, ROOT_STATE_STUB);

      expect(task).toStrictEqual(TASK_NODE_STUB);
    });

    it.each<[string, RootState | undefined]>([
      ['gone', undefined],
      ['without a model', NO_MODEL],
      ['without package a', NO_PACKAGE],
      ['with package a but not the task', NO_TASK]
    ])('WHEN its root is %s THEN no model task is found', (_name, state) => {
      const task = modelTaskOf(TARGET, state);

      expect(task).toBeUndefined();
    });
  });

  describe('GIVEN the target task of package a', () => {
    it('WHEN its root is loaded with a binary THEN the request runs that task with that binary', () => {
      const expected: RunRequest = {
        root: '/ws',
        packageName: 'a',
        task: TASK_NODE_STUB,
        binaryPath: TURBO_BINARY_STUB.path,
        force: false
      };

      const request = runRequestOf(TARGET, LOADED, false);

      expect(request).toStrictEqual(expected);
    });

    it('WHEN it is asked as a forced run THEN the request is marked forced', () => {
      const request = runRequestOf(TARGET, LOADED, true);

      expect(request?.force).toBe(true);
    });

    it.each<[string, RootState | undefined]>([
      ['gone', undefined],
      ['without a binary', ROOT_STATE_STUB],
      ['without a model', NO_MODEL],
      ['without package a', NO_PACKAGE],
      ['with package a but not the task', NO_TASK]
    ])('WHEN its root is %s THEN there is nothing to run', (_name, state) => {
      const request = runRequestOf(TARGET, state, false);

      expect(request).toBeNull();
    });
  });

  describe('GIVEN the model of a root', () => {
    it('WHEN its task ids are listed THEN every task of every package is in them', () => {
      const ids = taskIdsOf(MODEL);

      expect(ids).toStrictEqual(new Set(['build', 'a#test']));
    });

    it('WHEN the root has no model THEN it has no task ids', () => {
      const ids = taskIdsOf(null);

      expect(ids).toStrictEqual(new Set());
    });
  });
});
