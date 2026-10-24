import { describe, expect, it } from 'vitest';

import { atomGroupsOf } from './atom-groups.util.ts';
import { WORKSPACE_MODEL_STUB } from '../../cache/test/stubs/cache.stub.ts';
import { TASK_NODE_STUB } from '../../run-summary/test/stubs/task-node.stub.ts';
import type { PackageNode, TaskAtom, TaskNode, TaskNodeKind, WorkspaceModel } from '../common/workspace-model.type.ts';

const atomOf = (group: string, isLive = false): TaskAtom => {
  const atom: TaskAtom = { group, isLive };

  return atom;
};

const atomTask = (packageName: string, name: string, kind: TaskNodeKind, atom: TaskAtom): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `${packageName}#${name}`, name, kind, atom };

  return task;
};

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { name, path: `packages/${name}`, label: null, tags: [], tasks };

  return pkg;
};

const modelOf = (packages: PackageNode[]): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return model;
};

const umbrellaOf = (packageName: string, group: string): TaskNode => atomTask(packageName, group, 'atom-umbrella', atomOf(group));

const fileOf = (packageName: string, group: string, spec: string, live = false): TaskNode =>
  atomTask(packageName, `${group}--${spec}`, 'atom-file', atomOf(group, live));

const UMBRELLA = umbrellaOf('a', 'e2e-ci');

const FILE = (spec: string, live = false): TaskNode => fileOf('a', 'e2e-ci', spec, live);

const specPathsOf = (model: WorkspaceModel): string[] => {
  const files = atomGroupsOf(model).flatMap((group) => group.files);

  return files.map((file) => file.specPath);
};

describe('FEATURE: atom groups', () => {
  describe('GIVEN a package with an umbrella and files', () => {
    it('WHEN the groups are built THEN one group holds the files sorted by specPath, with isLive carried over', () => {
      const pkg = packageOf('a', [UMBRELLA, FILE('tests/b.spec.ts'), FILE('tests/a.spec.ts', true)]);

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
      const task = FILE('tests/a.spec.ts');
      const pkg = packageOf('a', [UMBRELLA, task]);

      const files = atomGroupsOf(modelOf([pkg])).flatMap((group) => group.files);

      expect(files.map((file) => file.task)).toStrictEqual([task]);
    });
  });

  describe('GIVEN spec paths that differ by case and space', () => {
    it('WHEN the groups are built THEN the files sort in code-unit order, not locale order', () => {
      const specs = ['tests/b.spec.ts', 'tests/B.spec.ts', 'tests/b fails.spec.ts'];
      const fileTasks = specs.map((spec) => FILE(spec));
      const pkg = packageOf('a', [UMBRELLA, ...fileTasks]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/B.spec.ts', 'tests/b fails.spec.ts', 'tests/b.spec.ts']);
    });
  });

  describe('GIVEN a spec path that holds a space or a double dash', () => {
    it('WHEN the groups are built THEN a spaced path is kept verbatim', () => {
      const pkg = packageOf('a', [UMBRELLA, FILE('tests/b fails.spec.ts')]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/b fails.spec.ts']);
    });

    it('WHEN the groups are built THEN a double dash inside the path is kept', () => {
      const pkg = packageOf('a', [UMBRELLA, FILE('tests/a--b.spec.ts')]);

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
      const pkg = packageOf('a', [UMBRELLA, stray, FILE('tests/a.spec.ts')]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/a.spec.ts']);
    });
  });

  describe('GIVEN two umbrellas in one package', () => {
    it('WHEN the groups are built THEN each group holds only its own files', () => {
      const smoke = umbrellaOf('a', 'e2e-smoke');
      const pkg = packageOf('a', [UMBRELLA, smoke, FILE('tests/a.spec.ts'), fileOf('a', 'e2e-smoke', 'tests/s.spec.ts')]);

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
      const pkg = packageOf('a', [UMBRELLA, mismatched, FILE('tests/a.spec.ts')]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/a.spec.ts']);
    });
  });

  describe('GIVEN the same group name in two packages', () => {
    it('WHEN the groups are built THEN a package never gets the other one files', () => {
      const pkgA = packageOf('a', [UMBRELLA, FILE('tests/a.spec.ts')]);
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
      const pkg = packageOf('a', [UMBRELLA, aggregate, TASK_NODE_STUB, FILE('tests/a.spec.ts')]);

      const specPaths = specPathsOf(modelOf([pkg]));

      expect(specPaths).toStrictEqual(['tests/a.spec.ts']);
    });

    it('WHEN the model has no umbrella THEN there are no groups', () => {
      const aggregate = atomTask('a', 'e2e-ci--all', 'atom-aggregate', atomOf('e2e-ci'));
      const pkg = packageOf('a', [aggregate, TASK_NODE_STUB, FILE('tests/a.spec.ts')]);

      const groups = atomGroupsOf(modelOf([pkg]));

      expect(groups).toStrictEqual([]);
    });
  });

  describe('GIVEN two packages with groups', () => {
    it('WHEN the groups are built THEN they follow package order', () => {
      const pkgB = packageOf('b', [umbrellaOf('b', 'e2e-ci'), fileOf('b', 'e2e-ci', 'tests/b.spec.ts')]);
      const pkgA = packageOf('a', [UMBRELLA, FILE('tests/a.spec.ts')]);

      const groups = atomGroupsOf(modelOf([pkgB, pkgA]));

      expect(groups.map((group) => group.packageName)).toStrictEqual(['b', 'a']);
    });
  });
});
