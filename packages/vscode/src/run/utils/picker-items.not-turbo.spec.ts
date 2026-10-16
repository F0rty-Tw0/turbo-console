import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { packageItems, taskItemsOf, taskNameItems } from './picker-items.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { PickItem } from '../common/picker.type.ts';

const taskNamed = (name: string, isTurboTask: boolean): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `p#${name}`, name, isTurboTask };

  return task;
};

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path: `packages/${name}`, tasks };

  return pkg;
};

const stateOf = (packages: PackageNode[]): RootState => {
  const folder: RootFolder = { root: '/ws', name: 'ws' };
  const model: RootState['model'] = { ...WORKSPACE_MODEL_STUB, root: '/ws', packages };
  const state: RootState = { ...ROOT_STATE_STUB, folder, model };

  return state;
};

const valuesOf = (items: PickItem[]): string[] => items.map((item) => item.value);

describe('FEATURE: picker items skip scripts no turbo config defines (spec 1c-a §4.13)', () => {
  describe('GIVEN a name runnable in package a and a plain script in package b', () => {
    const state = stateOf([
      packageOf('a', [taskNamed('lint', true)]),
      packageOf('b', [taskNamed('lint', false), taskNamed('zap', false)])
    ]);

    it('WHEN the task names are listed THEN the name stays and a name that is a script everywhere is gone', () => {
      expect(valuesOf(taskNameItems([state]))).toStrictEqual(['lint']);
    });

    it('WHEN the packages of the name are listed THEN only the package where it is runnable is there', () => {
      expect(valuesOf(packageItems(state, 'lint'))).toStrictEqual(['a']);
    });

    it('WHEN the name is a script in every package THEN no package is listed', () => {
      expect(packageItems(state, 'zap')).toStrictEqual([]);
    });
  });

  describe('GIVEN a package holding a turbo task and two scripts', () => {
    it('WHEN its tasks are listed THEN only the turbo task is there', () => {
      const pkg = packageOf('a', [taskNamed('build', true), taskNamed('fmt', false), taskNamed('zap', false)]);

      expect(valuesOf(taskItemsOf('/ws', pkg))).toStrictEqual(['build']);
    });

    it('WHEN it holds scripts only THEN no task is listed', () => {
      const pkg = packageOf('a', [taskNamed('fmt', false)]);

      expect(taskItemsOf('/ws', pkg)).toStrictEqual([]);
    });
  });
});
