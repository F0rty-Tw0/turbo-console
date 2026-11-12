import { describe, expect, it } from 'vitest';

import { toPackageNode } from './package-node.util.ts';
import { okConfigsByDir } from './task-description.util.ts';
import { turboTaskLookupOf } from './turbo-task.util.ts';
import type { TurboConfigFile } from '../common/turbo-config.type.ts';
import type { ClassifiedPackage, ClassifiedTask, PackageContext, PackageNode } from '../common/workspace-model.type.ts';
import { configError } from '../test/utils/config-error.spec.util.ts';
import { configOf } from '../test/utils/config-ok.spec.util.ts';

const COMMAND = 'node -e 0';

const classifiedTask = (id: string, name: string, rawDependencies: string[]): ClassifiedTask => {
  const task: ClassifiedTask = { id, name, command: COMMAND, tags: ['z', 'a'], rawDependencies, kind: 'task', atom: null };

  return task;
};

const classifiedPackage = (name: string, tasks: ClassifiedTask[]): ClassifiedPackage => {
  const pkg: ClassifiedPackage = { name, path: `packages/${name}`, tags: ['t2', 't1'], tasks };

  return pkg;
};

const nodeOf = (pkg: ClassifiedPackage, configs: TurboConfigFile[], singlePackage: boolean): PackageNode => {
  const lookup = turboTaskLookupOf(configs, [pkg], singlePackage);
  const dependenciesThrough = (raw: string[]): string[] => raw.toSorted();
  const context: PackageContext = { dependenciesThrough, configs: okConfigsByDir(configs), lookup, rootLabel: 'single-app' };

  return toPackageNode(pkg, context);
};

describe('FEATURE: package node', () => {
  describe('GIVEN a package with a turbo task build and a script lint no config keys', () => {
    const pkg = classifiedPackage('a', [classifiedTask('a#lint', 'lint', []), classifiedTask('a#build', 'build', [])]);
    const configs = [configOf({ build: 'defined' })];

    it('WHEN built THEN only build is a turbo task', () => {
      const node = nodeOf(pkg, configs, false);

      expect(node.tasks.map((task) => [task.id, task.isTurboTask])).toStrictEqual([
        ['a#build', true],
        ['a#lint', false]
      ]);
    });

    it('WHEN built THEN the tasks and tags are sorted', () => {
      const node = nodeOf(pkg, configs, false);

      expect(node.tasks[0]?.tags).toStrictEqual(['a', 'z']);
      expect(node.tags).toStrictEqual(['t1', 't2']);
    });
  });

  describe('GIVEN a package whose root config cannot be read', () => {
    it('WHEN built THEN every task counts as a turbo task and none as persistent', () => {
      const pkg = classifiedPackage('a', [classifiedTask('a#lint', 'lint', [])]);

      const node = nodeOf(pkg, [configError('turbo.json')], false);

      expect(node.tasks[0]).toMatchObject({ isTurboTask: true, persistent: false });
    });
  });

  describe('GIVEN a task whose dependencies resolve to itself and another task', () => {
    it('WHEN built THEN its own id is dropped', () => {
      const pkg = classifiedPackage('a', [classifiedTask('a#build', 'build', ['a#build', 'b#build'])]);

      const node = nodeOf(pkg, [configOf({ build: 'defined' })], false);

      expect(node.tasks[0]?.dependencies).toStrictEqual(['b#build']);
    });
  });

  describe.each([
    ['the // package of a single-package repo', '//', true, 'single-app'],
    ['the // package of a monorepo', '//', false, 'single-app'],
    ['a package of a single-package repo', 'a', true, null]
  ])('GIVEN %s', (_title, name, singlePackage, expected) => {
    it('WHEN built THEN its label is the one expected', () => {
      const pkg = classifiedPackage(name, [classifiedTask(`${name}#build`, 'build', [])]);

      const node = nodeOf(pkg, [configOf({ build: 'defined' })], singlePackage);

      expect(node.label).toBe(expected);
    });
  });
});
