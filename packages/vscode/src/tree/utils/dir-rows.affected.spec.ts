import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { dirRows, packageRow } from './dir-rows.util.ts';
import { DESCRIPTION_MAX } from '../../shared/common/text.const.ts';
import type { AffectedEntry, AffectedView } from '../common/affected.type.ts';
import type { RowInputs, TreeRow } from '../common/tree-row.type.ts';
import { AFFECTED_VIEW_STUB, CHANGED_LINE_STUB } from '../test/stubs/affected-view.stub.ts';
import { ROW_INPUTS_STUB, RUNNING_COUNTS_STUB } from '../test/stubs/tree-row.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { modelViewWith } from '../test/utils/row-context.spec.util.ts';

const taskOf = (id: string): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id };

  return task;
};

const packageAt = (name: string, path: string, ids: string[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path, tasks: ids.map(taskOf) };

  return pkg;
};

const PACKAGE_A = packageAt('a', 'packages/a', ['a#build', 'a#test', 'a#lint']);

const DEPENDENCY_ENTRY: AffectedEntry = { mark: 'dependency', line: CHANGED_LINE_STUB };

const DEPENDENCY_ONLY: AffectedView = { ...AFFECTED_VIEW_STUB, tasks: new Map([['a#test', DEPENDENCY_ENTRY]]) };

const inputsOf = (affected: AffectedView | null, running = RUNNING_COUNTS_STUB): RowInputs => {
  const inputs: RowInputs = { ...ROW_INPUTS_STUB, running, affected };

  return inputs;
};

const rowOf = (pkg: PackageNode, affected: AffectedView | null, running = RUNNING_COUNTS_STUB): TreeRow => {
  return packageRow('/ws', pkg, modelViewWith([pkg]), inputsOf(affected, running));
};

describe('FEATURE: package row affected mark', () => {
  describe('GIVEN package a with three tasks, two of them marked', () => {
    it('WHEN the row is built THEN the word follows the path and the count line is last', () => {
      const row = rowOf(PACKAGE_A, AFFECTED_VIEW_STUB);

      expect([row.description, row.tooltip]).toStrictEqual([
        'packages/a · affected',
        ['a', 'Path: packages/a', 'Tasks: 3', 'Affected (task level): 2 of 3 tasks (as of 14:05)']
      ]);
    });

    it('WHEN only a dependency task is marked THEN the word says via dependency', () => {
      const row = rowOf(PACKAGE_A, DEPENDENCY_ONLY);

      expect(row.description).toBe('packages/a · affected via dependency');
    });

    it('WHEN two runs are live THEN the running count sits between the path and the word', () => {
      const running = { packages: new Map([['a', 2]]), dirs: new Map() };

      const row = rowOf(PACKAGE_A, AFFECTED_VIEW_STUB, running);

      expect(row.description).toBe('packages/a · 2 running · affected');
    });

    it('WHEN the same package is listed in a folder level THEN it carries the mark too', () => {
      const level = { dirs: [], packages: ['a'] };

      const [row] = dirRows('/ws', level, modelViewWith([PACKAGE_A]), inputsOf(AFFECTED_VIEW_STUB));

      expect(row?.description).toBe('packages/a · affected');
    });
  });

  describe('GIVEN a package whose path equals its label', () => {
    it('WHEN it is marked THEN the description is the word alone', () => {
      const pkg = packageAt('a', 'a', ['a#build']);

      expect(rowOf(pkg, AFFECTED_VIEW_STUB).description).toBe('affected');
    });
  });

  describe('GIVEN a 200-character path', () => {
    it('WHEN the package is marked THEN the path is cut to 160 units and the word is whole behind it', () => {
      const pkg = packageAt('a', 'p'.repeat(200), ['a#build']);

      const { description } = rowOf(pkg, AFFECTED_VIEW_STUB);

      expect([description.length, description.endsWith('… · affected')]).toStrictEqual([DESCRIPTION_MAX + ' · affected'.length, true]);
    });
  });

  describe('GIVEN nothing marks the package', () => {
    it('WHEN the view marks no task of it THEN the row is the unmarked row', () => {
      const other: AffectedView = { ...AFFECTED_VIEW_STUB, tasks: new Map([['b#build', DEPENDENCY_ENTRY]]) };

      expect(rowOf(PACKAGE_A, other)).toStrictEqual(rowOf(PACKAGE_A, null));
    });

    it('WHEN there is no view THEN the description is the path and the tooltip has three lines', () => {
      const row = rowOf(PACKAGE_A, null);

      expect([row.description, row.tooltip]).toStrictEqual(['packages/a', ['a', 'Path: packages/a', 'Tasks: 3']]);
    });
  });
});
