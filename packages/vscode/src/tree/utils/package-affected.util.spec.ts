import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { packageAffectedOf } from './package-affected.util.ts';
import type { AffectedEntry, AffectedMark, AffectedView } from '../common/affected.type.ts';
import { AFFECTED_VIEW_STUB, CHANGED_LINE_STUB } from '../test/stubs/affected-view.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';

const taskOf = (id: string): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id };

  return task;
};

const packageOf = (name: string, ids: string[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, tasks: ids.map(taskOf) };

  return pkg;
};

const PACKAGE_A = packageOf('a', ['a#build', 'a#test', 'a#lint']);

const entryOf = (mark: AffectedMark): AffectedEntry => {
  const entry: AffectedEntry = { mark, line: CHANGED_LINE_STUB };

  return entry;
};

const viewOf = (marks: [string, AffectedMark][], overrides: Partial<AffectedView> = {}): AffectedView => {
  const tasks = new Map(marks.map(([id, mark]): [string, AffectedEntry] => [id, entryOf(mark)]));
  const view: AffectedView = { ...AFFECTED_VIEW_STUB, tasks, ...overrides };

  return view;
};

describe('FEATURE: package affected mark', () => {
  describe('GIVEN package a with three tasks', () => {
    it('WHEN a changed and a dependency task are marked THEN the word is affected and the line counts 2 of 3', () => {
      const affected = packageAffectedOf(PACKAGE_A, 3, AFFECTED_VIEW_STUB);

      expect(affected).toStrictEqual({ word: 'affected', line: 'Affected (task level): 2 of 3 tasks (as of 14:05)' });
    });

    it('WHEN only a dependency task is marked THEN the word is affected via dependency and the line counts 1 of 3', () => {
      const affected = packageAffectedOf(PACKAGE_A, 3, viewOf([['a#test', 'dependency']]));

      expect(affected).toStrictEqual({ word: 'affected via dependency', line: 'Affected (task level): 1 of 3 tasks (as of 14:05)' });
    });

    it('WHEN only ids of another package are marked THEN there is no mark', () => {
      expect(packageAffectedOf(PACKAGE_A, 3, viewOf([['b#build', 'changed']]))).toBeNull();
    });

    it('WHEN there is no view THEN there is no mark', () => {
      expect(packageAffectedOf(PACKAGE_A, 3, null)).toBeNull();
    });

    it('WHEN the view is package level THEN the line says package level', () => {
      const affected = packageAffectedOf(PACKAGE_A, 3, viewOf([['a#build', 'changed']], { mode: 'package' }));

      expect(affected?.line.startsWith('Affected (package level):')).toBe(true);
    });

    it('WHEN the view settled at 09:07 THEN the line pads the clock', () => {
      const settledAt = new Date(2026, 10, 11, 9, 7).getTime();

      const affected = packageAffectedOf(PACKAGE_A, 3, viewOf([['a#build', 'changed']], { settledAt }));

      expect(affected?.line.endsWith('(as of 09:07)')).toBe(true);
    });
  });

  describe('GIVEN the single-package root named //', () => {
    it('WHEN its one task is marked THEN the line counts 1 of 1', () => {
      const root = packageOf('//', ['//#build']);

      const affected = packageAffectedOf(root, 1, viewOf([['//#build', 'changed']]));

      expect(affected).toStrictEqual({ word: 'affected', line: 'Affected (task level): 1 of 1 tasks (as of 14:05)' });
    });
  });
});
