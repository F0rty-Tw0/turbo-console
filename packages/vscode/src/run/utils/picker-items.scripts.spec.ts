import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { packageItems, taskItemsOf, taskNameItems } from './picker-items.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { PickItem, TaskOffer } from '../common/picker.type.ts';

const HIDDEN: TaskOffer = { scriptsShown: false, packageManager: 'pnpm' };

const SHOWN: TaskOffer = { scriptsShown: true, packageManager: 'pnpm' };

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

describe('FEATURE: picker items offer scripts only while they are shown (spec 1c-b §4.8)', () => {
  describe('GIVEN lint is a turbo task in a and a script in b, zap a script, "a b" a refused script', () => {
    const state = stateOf([
      packageOf('a', [taskNamed('lint', true)]),
      packageOf('b', [taskNamed('lint', false), taskNamed('zap', false), taskNamed('a b', false)])
    ]);

    it('WHEN scripts are hidden and the names are listed THEN only the turbo name shows', () => {
      expect(valuesOf(taskNameItems([state], false))).toStrictEqual(['lint']);
    });

    it('WHEN scripts are shown and the names are listed THEN lint shows once with zap, and the refused name never', () => {
      expect(valuesOf(taskNameItems([state], true))).toStrictEqual(['lint', 'zap']);
    });

    it('WHEN scripts are hidden and the packages of lint are listed THEN only the turbo package is there', () => {
      expect(valuesOf(packageItems(state, 'lint', false))).toStrictEqual(['a']);
    });

    it('WHEN scripts are shown and the packages of lint are listed THEN both are there, sorted', () => {
      expect(valuesOf(packageItems(state, 'lint', true))).toStrictEqual(['a', 'b']);
    });

    it('WHEN a script name is hidden THEN no package is listed for it', () => {
      expect(packageItems(state, 'zap', false)).toStrictEqual([]);
    });

    it('WHEN the refused name is asked for with scripts shown THEN no package is listed', () => {
      expect(packageItems(state, 'a b', true)).toStrictEqual([]);
    });
  });

  describe('GIVEN a package holding two scripts and two turbo tasks, one script refused', () => {
    const pkg = packageOf('a', [
      taskNamed('zap', false),
      taskNamed('test', true),
      taskNamed('a;b', false),
      taskNamed('fmt', false),
      taskNamed('build', true)
    ]);

    it('WHEN scripts are shown THEN turbo tasks come first, then scripts, each sorted', () => {
      expect(valuesOf(taskItemsOf('/ws', pkg, SHOWN))).toStrictEqual(['build', 'test', 'fmt', 'zap']);
    });

    it('WHEN scripts are shown THEN a script item is described by its package manager run and a turbo task by nothing', () => {
      const descriptions = taskItemsOf('/ws', pkg, SHOWN).map((item) => item.description);

      expect(descriptions).toStrictEqual(['', '', 'pnpm run', 'pnpm run']);
    });

    it('WHEN the package manager is yarn THEN a script item says yarn run', () => {
      const yarn: TaskOffer = { scriptsShown: true, packageManager: 'yarn' };

      expect(taskItemsOf('/ws', pkg, yarn)[2]?.description).toBe('yarn run');
    });

    it('WHEN scripts are hidden THEN only the turbo tasks show', () => {
      expect(valuesOf(taskItemsOf('/ws', pkg, HIDDEN))).toStrictEqual(['build', 'test']);
    });

    it('WHEN it holds scripts only and they are hidden THEN no task is listed', () => {
      const scripts = packageOf('a', [taskNamed('fmt', false)]);

      expect(taskItemsOf('/ws', scripts, HIDDEN)).toStrictEqual([]);
    });
  });
});
