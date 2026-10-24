import { describe, expect, it } from 'vitest';

import { atomGroupsOf } from './atom-groups.util.ts';
import { TASK_NODE_STUB } from '../../run-summary/test/stubs/task-node.stub.ts';
import { modelOf, packageOf, specPathsOf } from '../test/utils/atom-model.spec.util.ts';
import { atomOf, atomTask, ciFileOf, fileOf, umbrellaOf } from '../test/utils/atom-task.spec.util.ts';

const UMBRELLA = umbrellaOf('a', 'e2e-ci');

describe('FEATURE: atom groups', () => {
  describe('GIVEN a package with an umbrella and files', () => {
    it('WHEN the groups are built THEN one group holds the files sorted by specPath, with isLive carried over', () => {
      const pkg = packageOf('a', [UMBRELLA, ciFileOf('tests/b.spec.ts'), ciFileOf('tests/a.spec.ts', true)]);

      const groups = atomGroupsOf(modelOf([pkg]));
      const files = groups.flatMap((group) => group.files);

      expect(groups.map((group) => group.packageName)).toStrictEqual(['a']);
      expect(groups.map((group) => group.umbrella)).toStrictEqual([UMBRELLA]);
      expect(files.map((file) => [file.specPath, file.isLive])).toStrictEqual([
        ['tests/a.spec.ts', true],
        ['tests/b.spec.ts', false]
      ]);
    });

    it('WHEN the groups are built THEN each file keeps its task', () => {
      const task = ciFileOf('tests/a.spec.ts');
      const pkg = packageOf('a', [UMBRELLA, task]);

      const files = atomGroupsOf(modelOf([pkg])).flatMap((group) => group.files);

      expect(files.map((file) => file.task)).toStrictEqual([task]);
    });
  });

  describe('GIVEN spec paths that differ by case and space', () => {
    it('WHEN the groups are built THEN the files sort in code-unit order, not locale order', () => {
      const specs = ['tests/b.spec.ts', 'tests/B.spec.ts', 'tests/b fails.spec.ts'];
      const fileTasks = specs.map((spec) => ciFileOf(spec));
      const pkg = packageOf('a', [UMBRELLA, ...fileTasks]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/B.spec.ts', 'tests/b fails.spec.ts', 'tests/b.spec.ts']);
    });
  });

  describe('GIVEN a spec path that holds a space or a double dash', () => {
    it('WHEN the groups are built THEN a spaced path is kept verbatim', () => {
      const pkg = packageOf('a', [UMBRELLA, ciFileOf('tests/b fails.spec.ts')]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/b fails.spec.ts']);
    });

    it('WHEN the groups are built THEN a double dash inside the path is kept', () => {
      const pkg = packageOf('a', [UMBRELLA, ciFileOf('tests/a--b.spec.ts')]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/a--b.spec.ts']);
    });
  });

  describe('GIVEN an umbrella without files', () => {
    it('WHEN the groups are built THEN there is no group', () => {
      const pkg = packageOf('a', [UMBRELLA]);

      const groups = atomGroupsOf(modelOf([pkg]));

      expect(groups).toStrictEqual([]);
    });
  });

  describe('GIVEN a file task whose name lacks the group prefix', () => {
    it('WHEN the groups are built THEN it is skipped and the valid files stay', () => {
      const stray = atomTask('a', 'other--x.spec.ts', 'atom-file', atomOf('e2e-ci'));
      const pkg = packageOf('a', [UMBRELLA, stray, ciFileOf('tests/a.spec.ts')]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/a.spec.ts']);
    });
  });

  describe('GIVEN two umbrellas in one package', () => {
    it('WHEN the groups are built THEN each group holds only its own files', () => {
      const smoke = umbrellaOf('a', 'e2e-smoke');
      const pkg = packageOf('a', [UMBRELLA, smoke, ciFileOf('tests/a.spec.ts'), fileOf('a', 'e2e-smoke', 'tests/s.spec.ts')]);

      const groups = atomGroupsOf(modelOf([pkg]));

      expect(groups.map((group) => [group.umbrella.name, group.files.map((file) => file.specPath)])).toStrictEqual([
        ['e2e-ci', ['tests/a.spec.ts']],
        ['e2e-smoke', ['tests/s.spec.ts']]
      ]);
    });
  });

  describe('GIVEN a file task named for one group but tagged with another', () => {
    it('WHEN the groups are built THEN it joins no group of the name prefix', () => {
      const mismatched = atomTask('a', 'e2e-ci--tests/x.spec.ts', 'atom-file', atomOf('e2e-smoke'));
      const pkg = packageOf('a', [UMBRELLA, mismatched, ciFileOf('tests/a.spec.ts')]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/a.spec.ts']);
    });
  });

  describe('GIVEN the same group name in two packages', () => {
    it('WHEN the groups are built THEN a package never gets the other one files', () => {
      const pkgA = packageOf('a', [UMBRELLA, ciFileOf('tests/a.spec.ts')]);
      const pkgB = packageOf('b', [umbrellaOf('b', 'e2e-ci'), fileOf('b', 'e2e-ci', 'tests/b.spec.ts')]);

      const groups = atomGroupsOf(modelOf([pkgA, pkgB]));

      expect(groups.map((group) => group.files.map((file) => file.task.id))).toStrictEqual([
        ['a#e2e-ci--tests/a.spec.ts'],
        ['b#e2e-ci--tests/b.spec.ts']
      ]);
    });
  });

  describe('GIVEN an aggregate, a plain task, and no umbrella', () => {
    it('WHEN the groups are built THEN the aggregate and the plain task join no group', () => {
      const aggregate = atomTask('a', 'e2e-ci--all', 'atom-aggregate', atomOf('e2e-ci'));
      const pkg = packageOf('a', [UMBRELLA, aggregate, TASK_NODE_STUB, ciFileOf('tests/a.spec.ts')]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/a.spec.ts']);
    });

    it('WHEN the model has no umbrella THEN there are no groups', () => {
      const aggregate = atomTask('a', 'e2e-ci--all', 'atom-aggregate', atomOf('e2e-ci'));
      const pkg = packageOf('a', [aggregate, TASK_NODE_STUB, ciFileOf('tests/a.spec.ts')]);

      const groups = atomGroupsOf(modelOf([pkg]));

      expect(groups).toStrictEqual([]);
    });
  });

  describe('GIVEN two packages with groups', () => {
    it('WHEN the groups are built THEN they follow package order', () => {
      const pkgB = packageOf('b', [umbrellaOf('b', 'e2e-ci'), fileOf('b', 'e2e-ci', 'tests/b.spec.ts')]);
      const pkgA = packageOf('a', [UMBRELLA, ciFileOf('tests/a.spec.ts')]);

      const groups = atomGroupsOf(modelOf([pkgB, pkgA]));

      expect(groups.map((group) => group.packageName)).toStrictEqual(['b', 'a']);
    });
  });
});
