import type { TaskKind } from '@turbo-console/repo-gen';
import { describe, expect, it } from 'vitest';

import { expectedAffected } from './affected-oracle.spec.util.ts';
import type { AffectedEdit } from '../common/affected.type.ts';
import type { ShownManifest, ShownPackage, ShownTask } from '../common/launch.type.ts';

const packageOf = (name: string, dependencies: string[]): ShownPackage => {
  const pkg: ShownPackage = { name, path: `packages/${name}`, role: 'regular', dependencies, tags: [] };

  return pkg;
};

const taskOf = (fullName: string, dependencies: string[], change: Partial<ShownTask> = {}): ShownTask => {
  const task: ShownTask = {
    fullName,
    packageName: fullName.split('#')[0] ?? fullName,
    kind: 'task',
    dependencies,
    visible: true,
    ...change
  };

  return task;
};

const BASE_TASKS: ShownTask[] = [
  taskOf('c#build', []),
  taskOf('c#test', []),
  taskOf('x#build', ['c#build']),
  taskOf('x#test', ['c#build']),
  taskOf('x#task-5', ['x#build']),
  taskOf('b#build', ['x#build']),
  taskOf('b#test', ['x#build']),
  taskOf('p#build', []),
  taskOf('p#test', []),
  taskOf('u#build', ['x#build', 'p#test'])
];

/** Not a task row of the tree: a phantom, a carrier, an atom file task, and the umbrella over them, all in package `x`. */
const EXTRA_TASKS: ShownTask[] = [
  taskOf('x#lint', [], { kind: 'phantom', visible: false }),
  taskOf('x#e2e-ci-src--a', [], { kind: 'carrier', visible: false }),
  taskOf('x#e2e-ci--a', ['x#e2e-ci-src--a'], { kind: 'atom-file' }),
  taskOf('x#e2e-ci', ['x#e2e-ci--a'], { kind: 'umbrella' })
];

const PACKAGES: ShownPackage[] = [
  packageOf('c', []),
  packageOf('x', ['c']),
  packageOf('b', ['x']),
  packageOf('p', []),
  packageOf('u', [])
];

const manifestOf = (tasks: ShownTask[]): ShownManifest => {
  const manifest: ShownManifest = { packages: PACKAGES, tasks };

  return manifest;
};

const MANIFEST = manifestOf(BASE_TASKS);

const SRC_X: AffectedEdit = { packageName: 'x', file: 'src/index.ts' };

const README_P: AffectedEdit = { packageName: 'p', file: 'README.md' };

describe('FEATURE: expectedAffected', () => {
  describe('GIVEN a src edit of x in task mode', () => {
    it('WHEN the oracle runs THEN x seeds changed, dependents and required tasks read dependency', () => {
      const marks = expectedAffected(MANIFEST, [SRC_X], 'task');

      expect(marks).toStrictEqual(
        new Map([
          ['x#build', 'changed'],
          ['x#task-5', 'changed'],
          ['x#test', 'changed'],
          ['b#build', 'dependency'],
          ['b#test', 'dependency'],
          ['u#build', 'dependency'],
          ['c#build', 'dependency'],
          ['p#test', 'dependency']
        ])
      );
    });

    it('WHEN x#task-5 depends on the seed x#build THEN it stays a seed, changed, and nothing throws', () => {
      const marks = expectedAffected(MANIFEST, [SRC_X], 'task');

      expect(marks.get('x#task-5')).toBe('changed');
    });
  });

  describe('GIVEN a README edit of p, the package whose test narrows its inputs to src', () => {
    it('WHEN the mode is task THEN p#test is absent', () => {
      const marks = expectedAffected(MANIFEST, [README_P], 'task');

      expect(marks.has('p#test')).toBe(false);
    });

    it('WHEN the mode is package THEN p#test is changed', () => {
      const marks = expectedAffected(MANIFEST, [README_P], 'package');

      expect(marks.get('p#test')).toBe('changed');
    });
  });

  describe('GIVEN a src edit of x and a README edit of p in task mode', () => {
    it('WHEN p#test is required by u#build while p#build is a seed THEN p#test reads changed', () => {
      const marks = expectedAffected(MANIFEST, [SRC_X, README_P], 'task');

      expect(marks.get('p#test')).toBe('changed');
    });
  });

  describe('GIVEN a package with a phantom, a carrier, an atom file task and an umbrella', () => {
    const extended = manifestOf([...BASE_TASKS, ...EXTRA_TASKS]);

    it('WHEN x is edited THEN a phantom, a carrier and an atom file task never appear', () => {
      const marks = expectedAffected(extended, [SRC_X], 'task');
      const ids = Array.from(marks.keys());
      const isExtra = (id: string): boolean => id.startsWith('x#e2e-ci') || id === 'x#lint';

      expect(ids.filter(isExtra)).toStrictEqual(['x#e2e-ci']);
    });

    it('WHEN x is edited THEN its umbrella reads dependency although x has seeds', () => {
      const marks = expectedAffected(extended, [SRC_X], 'task');

      expect(marks.get('x#e2e-ci')).toBe('dependency');
    });
  });

  describe('GIVEN a package with an aggregate over its atom file task', () => {
    const aggregate = taskOf('x#e2e-ci--all', ['x#e2e-ci--a'], { kind: 'aggregate' });
    const withAggregate = manifestOf([...BASE_TASKS, ...EXTRA_TASKS, aggregate]);

    it('WHEN x is edited with the default kinds THEN the aggregate is absent', () => {
      const marks = expectedAffected(withAggregate, [SRC_X], 'task');

      expect(marks.has('x#e2e-ci--all')).toBe(false);
    });

    it('WHEN x is edited with aggregate among the kinds THEN the aggregate reads dependency', () => {
      const kinds = new Set<TaskKind>(['task', 'umbrella', 'aggregate']);
      const marks = expectedAffected(withAggregate, [SRC_X], 'task', kinds);

      expect(marks.get('x#e2e-ci--all')).toBe('dependency');
    });
  });

  describe('GIVEN a README edit of q, whose only seed is an atom file task that requires q#test', () => {
    const atomOnly = manifestOf([taskOf('q#test', []), taskOf('q#e2e-ci--a', ['q#test'], { kind: 'atom-file' })]);
    const README_Q: AffectedEdit = { packageName: 'q', file: 'README.md' };

    it('WHEN the oracle runs THEN q#test reads dependency: a seed the tree does not keep makes no task changed', () => {
      const marks = expectedAffected(atomOnly, [README_Q], 'task');

      expect(marks).toStrictEqual(new Map([['q#test', 'dependency']]));
    });
  });

  describe('GIVEN edits of x and of b, whose b#build depends on x#build', () => {
    it('WHEN the oracle runs THEN it throws ambiguous edit set', () => {
      const edits: AffectedEdit[] = [SRC_X, { packageName: 'b', file: 'src/index.ts' }];

      expect(() => expectedAffected(MANIFEST, edits, 'task')).toThrow('ambiguous edit set');
    });
  });
});
