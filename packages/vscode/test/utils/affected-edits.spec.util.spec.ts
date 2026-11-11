import { describe, expect, it } from 'vitest';

import { affectedEditsOf } from './affected-edits.spec.util.ts';
import type { ShownManifest, ShownPackage, ShownTask } from '../common/launch.type.ts';

const packageOf = (name: string, dependencies: string[], change: Partial<ShownPackage> = {}): ShownPackage => {
  const pkg: ShownPackage = { name, path: `packages/${name}`, role: 'regular', dependencies, tags: [], ...change };

  return pkg;
};

const buildOf = (packageName: string, change: Partial<ShownTask> = {}): ShownTask => {
  const task: ShownTask = {
    fullName: `${packageName}#build`,
    packageName,
    kind: 'task',
    dependencies: [],
    visible: true,
    ...change
  };

  return task;
};

const manifestOf = (packages: ShownPackage[], tasks: ShownTask[]): ShownManifest => {
  const manifest: ShownManifest = { packages, tasks };

  return manifest;
};

/** `app` depends on `lib` and nothing depends on `app`; `solo` is isolated; `e2e` is an atom test package that depends on `lib`. */
const PACKAGES: ShownPackage[] = [
  packageOf('lib', []),
  packageOf('app', ['lib']),
  packageOf('solo', []),
  packageOf('e2e', ['lib'], { role: 'atom-test' })
];

const BUILDS: ShownTask[] = [buildOf('lib'), buildOf('app'), buildOf('solo'), buildOf('e2e')];

describe('FEATURE: affectedEditsOf', () => {
  describe('GIVEN a manifest with a leaf, an isolated package and an atom test package', () => {
    const manifest = manifestOf(PACKAGES, BUILDS);

    it('WHEN the roles are picked THEN leaf is the first regular package nobody depends on', () => {
      const edits = affectedEditsOf(manifest);

      expect(edits.leaf.name).toBe('app');
    });

    it('WHEN the roles are picked THEN readme is the first package with no dependency, no dependent and a build', () => {
      const edits = affectedEditsOf(manifest);

      expect(edits.readme.name).toBe('solo');
    });

    it('WHEN the roles are picked THEN atomDependency is the first dependency of the atom test package', () => {
      const edits = affectedEditsOf(manifest);

      expect(edits.atomDependency.name).toBe('lib');
    });
  });

  describe('GIVEN an isolated package that shows no build', () => {
    it('WHEN the roles are picked THEN it is not readme and the throw names the role', () => {
      const manifest = manifestOf(PACKAGES, [buildOf('lib'), buildOf('app'), buildOf('e2e')]);

      expect(() => affectedEditsOf(manifest)).toThrow('readme');
    });
  });

  describe('GIVEN no regular package that nobody depends on', () => {
    it('WHEN the roles are picked THEN the throw names the leaf role', () => {
      const manifest = manifestOf([packageOf('a', ['b']), packageOf('b', ['a'])], [buildOf('a'), buildOf('b')]);

      expect(() => affectedEditsOf(manifest)).toThrow('leaf');
    });
  });

  describe('GIVEN no atom test package', () => {
    it('WHEN the roles are picked THEN the throw names the atomDependency role', () => {
      const packages = PACKAGES.filter((pkg) => pkg.role !== 'atom-test');

      expect(() => affectedEditsOf(manifestOf(packages, BUILDS))).toThrow('atomDependency');
    });
  });
});
