import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { modelViewWith } from '../test/utils/row-context.spec.util.ts';

const ATOM_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'atom', name: 'atom', kind: 'atom-file' };

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'lint', name: 'lint', isTurboTask: false };

const packageOf = (name: string, tasks: TaskNode[] = [TASK_NODE_STUB], path = `packages/${name}`): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path, tasks };

  return pkg;
};

const shownNamesOf = (packages: PackageNode[]): string[] => {
  const view = modelViewWith(packages);
  const names = view.packages.keys();

  return Array.from(names);
};

const labelsOf = (packages: PackageNode[]): string[] => {
  const view = modelViewWith(packages);
  const labels = view.bareTexts.values();

  return Array.from(labels);
};

const labelsOfNames = (names: string[]): string[] => {
  const packages = names.map((name) => packageOf(name));

  return labelsOf(packages);
};

describe('FEATURE: model view', () => {
  describe('GIVEN packages with and without visible tasks', () => {
    it('WHEN a package has only atom-file tasks THEN it is not shown', () => {
      const names = shownNamesOf([packageOf('a'), packageOf('atoms', [ATOM_TASK])]);

      expect(names).toStrictEqual(['a']);
    });

    it('WHEN a package has no tasks THEN it is not shown', () => {
      const names = shownNamesOf([packageOf('a'), packageOf('configs', [])]);

      expect(names).toStrictEqual(['a']);
    });

    it('WHEN a package has only non-turbo scripts THEN it is shown', () => {
      const names = shownNamesOf([packageOf('scripts', [SCRIPT_TASK])]);

      expect(names).toStrictEqual(['scripts']);
    });

    it('WHEN the view is built THEN each shown package counts only its visible tasks', () => {
      const view = modelViewWith([packageOf('a', [TASK_NODE_STUB, ATOM_TASK, SCRIPT_TASK]), packageOf('atoms', [ATOM_TASK])]);

      expect(view.visibleTaskCounts).toStrictEqual(new Map([['a', 2]]));
    });

    it('WHEN a directory holds only a hidden package THEN it has no folder', () => {
      const view = modelViewWith([packageOf('web', [], 'apps/web'), packageOf('a')]);
      const paths = view.folders.dirs.map((dir) => dir.path);

      expect(paths).toStrictEqual(['packages']);
    });
  });

  describe('GIVEN shown packages with and without scopes', () => {
    it('WHEN two scopes hold different names THEN each reads its name without the scope', () => {
      const labels = labelsOfNames(['@a/x', '@b/y']);

      expect(labels).toStrictEqual(['x', 'y']);
    });

    it('WHEN a package has no scope THEN it reads its name', () => {
      const labels = labelsOfNames(['z']);

      expect(labels).toStrictEqual(['z']);
    });

    it('WHEN two scopes hold the same name THEN both keep their full names', () => {
      const labels = labelsOfNames(['@a/ui', '@b/ui']);

      expect(labels).toStrictEqual(['@a/ui', '@b/ui']);
    });

    it('WHEN a scoped name matches an unscoped one THEN the scoped one keeps its full name', () => {
      const labels = labelsOfNames(['@acme/utils', 'utils']);

      expect(labels).toStrictEqual(['@acme/utils', 'utils']);
    });

    it('WHEN a scoped name matches only a hidden package THEN it reads its name without the scope', () => {
      const labels = labelsOf([packageOf('@acme/utils'), packageOf('utils', [ATOM_TASK])]);

      expect(labels).toStrictEqual(['utils']);
    });

    it('WHEN a name is a scope with nothing after the slash THEN it keeps its full name', () => {
      const labels = labelsOfNames(['@a/']);

      expect(labels).toStrictEqual(['@a/']);
    });

    it('WHEN a scoped name has a rest that cleans to nothing THEN it reads its cleaned full name', () => {
      const labels = labelsOfNames(['@a/​']);

      expect(labels).toStrictEqual(['@a/']);
    });

    it('WHEN a scoped name has a rest that cleans to a space THEN it keeps its full name', () => {
      const labels = labelsOfNames(['@a/ ']);

      expect(labels).toStrictEqual(['@a/ ']);
    });

    it('WHEN a name starts with @ and has no slash THEN it keeps its full name', () => {
      const labels = labelsOfNames(['@x']);

      expect(labels).toStrictEqual(['@x']);
    });

    it('WHEN a scoped name holds a second slash THEN it reads everything after the scope', () => {
      const labels = labelsOfNames(['@a/b/c']);

      expect(labels).toStrictEqual(['b/c']);
    });

    it('WHEN a rest equals the full name a collision leaves another package THEN it keeps its full name', () => {
      const labels = labelsOfNames(['@a/ui', '@b/ui', '@c/@a/ui']);

      expect(labels).toStrictEqual(['@a/ui', '@b/ui', '@c/@a/ui']);
    });

    it('WHEN each fallback leaves a new pair along a chain of nested scopes THEN every scoped one keeps its full name', () => {
      const labels = labelsOfNames(['@a/x', 'x', '@b/@a/x', '@c/@b/@a/x']);

      expect(labels).toStrictEqual(['@a/x', 'x', '@b/@a/x', '@c/@b/@a/x']);
    });

    it('WHEN a rest and an unscoped name read the same once cleaned THEN the scoped one keeps its full name', () => {
      const labels = labelsOfNames(['@a/x', 'x​']);

      expect(labels).toStrictEqual(['@a/x', 'x']);
    });

    it('WHEN a rest cleans to an unscoped name THEN the scoped one reads its cleaned full name', () => {
      const labels = labelsOfNames(['@a/x​', 'x']);

      expect(labels).toStrictEqual(['@a/x', 'x']);
    });
  });
});
