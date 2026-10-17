import { TurboException } from '@turbo-console/core';
import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { packageItems, rootItems, taskItemsOf, taskNameItems } from './picker-items.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { LoadFailure, RootFolder } from '../../roots/common/root.type.ts';
import { loadFailureOf } from '../../roots/test/utils/load-failure.spec.util.ts';
import { DESCRIPTION_MAX, LABEL_MAX } from '../../shared/common/text.const.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { PickItem, TaskOffer } from '../common/picker.type.ts';

const HIDDEN: TaskOffer = { scriptsShown: false, packageManager: 'pnpm' };

const BIDI = String.fromCodePoint(0x202e);

const taskNamed = (name: string, overrides: Partial<TaskNode> = {}): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `p#${name}`, name, ...overrides };

  return task;
};

const packageOf = (name: string, tasks: TaskNode[], path = `packages/${name}`): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path, tasks };

  return pkg;
};

const stateOf = (root: string, packages: PackageNode[], overrides: Partial<RootState> = {}): RootState => {
  const name = root.slice(1);
  const model: RootState['model'] = { ...WORKSPACE_MODEL_STUB, root, packages };
  const folder: RootFolder = { root, name };
  const state: RootState = { ...ROOT_STATE_STUB, folder, model, ...overrides };

  return state;
};

const binaryFailure: LoadFailure = loadFailureOf('binary', new TurboException('not-found', 'no turbo'));

const itemOf = (overrides: Partial<PickItem>): PickItem => {
  const item: PickItem = { label: 'build', description: '', root: '/ws', value: 'build', ...overrides };

  return item;
};

const labelsOf = (items: PickItem[]): string[] => items.map((item) => item.label);

describe('FEATURE: picker items', () => {
  describe('taskNameItems', () => {
    it('GIVEN packages sharing task names WHEN listed THEN each name shows once, sorted', () => {
      const packages = [
        packageOf('a', [taskNamed('test'), taskNamed('build')]),
        packageOf('b', [taskNamed('build'), taskNamed('lint')])
      ];

      const items = taskNameItems([stateOf('/ws', packages)], false);

      expect(labelsOf(items)).toStrictEqual(['build', 'lint', 'test']);
    });

    it('GIVEN an atom-file task WHEN listed THEN it is hidden', () => {
      const atom = taskNamed('atom', { kind: 'atom-file' });

      const items = taskNameItems([stateOf('/ws', [packageOf('a', [atom, taskNamed('build')])])], false);

      expect(labelsOf(items)).toStrictEqual(['build']);
    });

    it('GIVEN one root WHEN listed THEN the description is empty and value and root are set', () => {
      const items = taskNameItems([stateOf('/ws', [packageOf('a', [taskNamed('build')])])], false);

      expect(items).toStrictEqual([itemOf({})]);
    });

    it('GIVEN two roots with a model WHEN listed THEN one item per root and name, described by the folder name', () => {
      const first = stateOf('/one', [packageOf('a', [taskNamed('build')])]);
      const second = stateOf('/two', [packageOf('b', [taskNamed('build')])]);

      const items = taskNameItems([first, second], false);

      expect(items).toStrictEqual([itemOf({ description: 'one', root: '/one' }), itemOf({ description: 'two', root: '/two' })]);
    });

    it('GIVEN two roots and one without a model WHEN listed THEN it adds none and the other has no description', () => {
      const loaded = stateOf('/one', [packageOf('a', [taskNamed('build')])]);
      const loading = stateOf('/two', [], { model: null });

      const items = taskNameItems([loaded, loading], false);

      expect(items).toStrictEqual([itemOf({ root: '/one' })]);
    });

    it('GIVEN a root in a binary error WHEN listed THEN it adds none, even with a shown model', () => {
      const broken = stateOf('/one', [packageOf('a', [taskNamed('build')])], { error: binaryFailure });
      const healthy = stateOf('/two', [packageOf('b', [taskNamed('lint')])]);

      const items = taskNameItems([broken, healthy], false);

      expect(items).toStrictEqual([itemOf({ label: 'lint', description: 'two', root: '/two', value: 'lint' })]);
    });

    it('GIVEN a long task name with a bidi mark WHEN listed THEN the label is cleaned and cut but the value is raw', () => {
      const name = `${BIDI}${'n'.repeat(LABEL_MAX + 30)}`;

      const items = taskNameItems([stateOf('/ws', [packageOf('a', [taskNamed(name)])])], false);

      expect(items[0]).toStrictEqual(itemOf({ label: `${'n'.repeat(LABEL_MAX - 1)}…`, value: name }));
    });

    it('GIVEN a task named like a codicon WHEN listed THEN the label escapes the dollar so no icon renders', () => {
      const items = taskNameItems([stateOf('/ws', [packageOf('a', [taskNamed('$(pass) build')])])], false);

      expect(items[0]).toStrictEqual(itemOf({ label: '\\$(pass) build', value: '$(pass) build' }));
    });

    it('GIVEN a folder named like a codicon WHEN listed in two roots THEN the description escapes the dollar', () => {
      const named = stateOf('/$(one)', [packageOf('a', [taskNamed('build')])]);
      const other = stateOf('/two', []);

      const items = taskNameItems([named, other], false);

      expect(items[0]?.description).toBe('\\$(one)');
    });

    it('GIVEN a task name whose bidi mark hides a codicon WHEN listed THEN the cleaned label is escaped', () => {
      const items = taskNameItems([stateOf('/ws', [packageOf('a', [taskNamed(`$${BIDI}(pass) build`)])])], false);

      expect(items[0]?.label).toBe('\\$(pass) build');
    });

    it('GIVEN a long folder name WHEN listed in two roots THEN the description is cut', () => {
      const root = `/${'f'.repeat(DESCRIPTION_MAX + 30)}`;
      const long = stateOf(root, [packageOf('a', [taskNamed('build')])]);
      const other = stateOf('/two', []);

      const items = taskNameItems([long, other], false);

      expect(items[0]?.description).toBe(`${'f'.repeat(DESCRIPTION_MAX - 1)}…`);
    });
  });

  describe('packageItems', () => {
    it('GIVEN packages WHEN listed for a task THEN only the packages holding it show, sorted by name', () => {
      const packages = [
        packageOf('b', [taskNamed('build')]),
        packageOf('c', [taskNamed('lint')]),
        packageOf('a', [taskNamed('build')])
      ];

      const items = packageItems(stateOf('/ws', packages), 'build', false);

      expect(labelsOf(items)).toStrictEqual(['a', 'b']);
    });

    it('GIVEN a package WHEN listed THEN the description is its path and value its raw name', () => {
      const pkg = packageOf(`${BIDI}x`, [taskNamed('build')], 'libs/x');

      const items = packageItems(stateOf('/ws', [pkg]), 'build', false);

      expect(items).toStrictEqual([{ label: 'x', description: 'libs/x', root: '/ws', value: `${BIDI}x` }]);
    });

    it('GIVEN only an atom-file task of that name WHEN listed THEN the package is left out', () => {
      const atom = taskNamed('build', { kind: 'atom-file' });

      const items = packageItems(stateOf('/ws', [packageOf('a', [atom])]), 'build', false);

      expect(items).toStrictEqual([]);
    });

    it('GIVEN a state with no model WHEN listed THEN there are none', () => {
      const items = packageItems(stateOf('/ws', [], { model: null }), 'build', false);

      expect(items).toStrictEqual([]);
    });

    it('GIVEN a package path with a codicon WHEN listed THEN the description escapes the dollar', () => {
      const pkg = packageOf('a', [taskNamed('build')], 'libs/$(x)');

      const items = packageItems(stateOf('/ws', [pkg]), 'build', false);

      expect(items[0]?.description).toBe('libs/\\$(x)');
    });

    it('GIVEN a path whose bidi mark hides a codicon WHEN listed THEN the cleaned text is escaped', () => {
      const pkg = packageOf('a', [taskNamed('build')], `libs/$${BIDI}(x)`);

      const items = packageItems(stateOf('/ws', [pkg]), 'build', false);

      expect(items[0]?.description).toBe('libs/\\$(x)');
    });

    it('GIVEN a package name like a codicon WHEN listed THEN the label escapes the dollar', () => {
      const items = packageItems(stateOf('/ws', [packageOf('$(bug)', [taskNamed('build')])]), 'build', false);

      expect(items[0]?.label).toBe('\\$(bug)');
    });
  });

  describe('taskItemsOf', () => {
    it('GIVEN a package WHEN its tasks are listed THEN the visible ones show, sorted, with raw values', () => {
      const atom = taskNamed('atom', { kind: 'atom-file' });
      const pkg = packageOf('a', [taskNamed('test'), atom, taskNamed('build')]);

      const items = taskItemsOf('/ws', pkg, HIDDEN);

      expect(items).toStrictEqual([itemOf({}), itemOf({ label: 'test', value: 'test' })]);
    });

    it('GIVEN a task named like a codicon WHEN listed THEN the label escapes the dollar', () => {
      const items = taskItemsOf('/ws', packageOf('a', [taskNamed('$(x)')]), HIDDEN);

      expect(items[0]).toStrictEqual(itemOf({ label: '\\$(x)', value: '$(x)' }));
    });
  });

  describe('rootItems', () => {
    it('GIVEN two roots WHEN listed THEN each shows its folder name, described by its path, with the root as value', () => {
      const items = rootItems([stateOf('/one', []), stateOf('/two', [])]);

      expect(items).toStrictEqual([
        itemOf({ label: 'one', description: '/one', root: '/one', value: '/one' }),
        itemOf({ label: 'two', description: '/two', root: '/two', value: '/two' })
      ]);
    });

    it('GIVEN a folder named like a codicon WHEN listed THEN the label escapes the dollar but the value is raw', () => {
      const items = rootItems([stateOf('/$(x)', [])]);

      expect(items[0]).toStrictEqual(itemOf({ label: '\\$(x)', description: '/\\$(x)', root: '/$(x)', value: '/$(x)' }));
    });
  });
});
