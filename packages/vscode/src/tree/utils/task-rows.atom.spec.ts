import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { taskChildRows, taskRowOf, taskRows } from './task-rows.util.ts';
import {
  ATOM_VIEW_STUB,
  A_FILE_STUB,
  E2E_PACKAGE_STUB,
  LIVE_FILE_STUB,
  SMOKE_FILE_STUB,
  SPACED_FILE_STUB,
  TWO_GROUP_PACKAGE_STUB,
  TWO_GROUP_VIEW_STUB
} from '../test/stubs/atom-view.stub.ts';
import { ROW_SCOPE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { atomContextOf } from '../test/utils/atom-context.spec.util.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

const CONTEXT = atomContextOf(ATOM_VIEW_STUB);

const TWO_GROUP_CONTEXT = atomContextOf(TWO_GROUP_VIEW_STUB);

const AGGREGATE_ID = 'e2e#e2e-ci--all';

const UMBRELLA_ID = 'e2e#e2e-ci';

const SMOKE_UMBRELLA_ID = 'e2e#e2e-smoke';

const OTHER_GROUP: TaskNode['atom'] = { group: 'other', isLive: false };

const packageWithAggregate = (atom: TaskNode['atom']): PackageNode => {
  const patched = (task: TaskNode): TaskNode => {
    if (task.id !== AGGREGATE_ID) return task;

    const patchedTask: TaskNode = { ...task, atom };

    return patchedTask;
  };
  const tasks = E2E_PACKAGE_STUB.tasks.map(patched);
  const pkg: PackageNode = { ...E2E_PACKAGE_STUB, tasks };

  return pkg;
};

const keysOf = (pkg: PackageNode): string[] => {
  const rows = taskRows(ROW_SCOPE_STUB, pkg, CONTEXT);

  return rows.map((row) => row.key);
};

describe('FEATURE: task rows of a package with Atomizer groups', () => {
  describe('GIVEN a package holding a group', () => {
    it('WHEN listed THEN the aggregate is hidden and the umbrella is collapsible', () => {
      const rows = taskRows(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, CONTEXT);

      expect(rows.map((row) => [row.key, row.collapsible, row.description])).toStrictEqual([
        ['e2e#build', 'none', ''],
        ['e2e#e2e-ci', 'collapsed', '3 files']
      ]);
    });

    it('WHEN the aggregate names another group THEN it stays', () => {
      const pkg = packageWithAggregate(OTHER_GROUP);

      expect(keysOf(pkg)).toStrictEqual(['e2e#build', UMBRELLA_ID, AGGREGATE_ID]);
    });

    it('WHEN the aggregate has no atom THEN it stays', () => {
      const pkg = packageWithAggregate(null);

      expect(keysOf(pkg)).toStrictEqual(['e2e#build', UMBRELLA_ID, AGGREGATE_ID]);
    });
  });

  describe('GIVEN a workspace without groups', () => {
    it('WHEN listed THEN the rows are exactly today’s', () => {
      const rows = taskRows(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, rowContextOf('list'));

      expect(rows.map((row) => [row.key, row.collapsible, row.contextValue])).toStrictEqual([
        ['e2e#build', 'none', 'turboTask'],
        [UMBRELLA_ID, 'none', 'turboTask'],
        [AGGREGATE_ID, 'none', 'turboTask']
      ]);
    });

    it('WHEN a file id is looked up THEN it has no row', () => {
      const row = taskRowOf(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, A_FILE_STUB.task.id, rowContextOf('list'));

      expect(row).toBeUndefined();
    });
  });

  describe('GIVEN a package holding a group and a row looked up alone', () => {
    it.each([
      [A_FILE_STUB.task.id, 'tests/a.spec.ts'],
      [SPACED_FILE_STUB.task.id, 'tests/b fails.spec.ts']
    ])('WHEN file id %s is looked up THEN its file row comes back', (taskId, label) => {
      const row = taskRowOf(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, taskId, CONTEXT);

      expect([row?.label, row?.contextValue]).toStrictEqual([label, 'turboTask.atomFile']);
    });

    it('WHEN the umbrella id is looked up THEN its umbrella row comes back', () => {
      const row = taskRowOf(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, UMBRELLA_ID, CONTEXT);

      expect([row?.collapsible, row?.description]).toStrictEqual(['collapsed', '3 files']);
    });

    it('WHEN the hidden aggregate id is looked up THEN it has no row', () => {
      expect(taskRowOf(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, AGGREGATE_ID, CONTEXT)).toBeUndefined();
    });

    it('WHEN an unknown id is looked up THEN it has no row', () => {
      expect(taskRowOf(ROW_SCOPE_STUB, E2E_PACKAGE_STUB, 'e2e#nope', CONTEXT)).toBeUndefined();
    });
  });

  describe('GIVEN a package holding two groups', () => {
    it('WHEN listed THEN each umbrella is collapsible and both aggregates are hidden', () => {
      const rows = taskRows(ROW_SCOPE_STUB, TWO_GROUP_PACKAGE_STUB, TWO_GROUP_CONTEXT);

      expect(rows.map((row) => [row.key, row.collapsible])).toStrictEqual([
        ['e2e#build', 'none'],
        [UMBRELLA_ID, 'collapsed'],
        [SMOKE_UMBRELLA_ID, 'collapsed']
      ]);
    });

    it('WHEN the first umbrella is opened THEN only its own files show', () => {
      const rows = taskChildRows(ROW_SCOPE_STUB, TWO_GROUP_PACKAGE_STUB, UMBRELLA_ID, TWO_GROUP_CONTEXT);

      expect(rows.map((row) => row.key)).toStrictEqual([A_FILE_STUB.task.id, SPACED_FILE_STUB.task.id, LIVE_FILE_STUB.task.id]);
    });

    it('WHEN the second umbrella is opened THEN only its own file shows', () => {
      const rows = taskChildRows(ROW_SCOPE_STUB, TWO_GROUP_PACKAGE_STUB, SMOKE_UMBRELLA_ID, TWO_GROUP_CONTEXT);

      expect(rows.map((row) => row.key)).toStrictEqual([SMOKE_FILE_STUB.task.id]);
    });

    it('WHEN a file of the second group is looked up THEN its file row comes back', () => {
      const row = taskRowOf(ROW_SCOPE_STUB, TWO_GROUP_PACKAGE_STUB, SMOKE_FILE_STUB.task.id, TWO_GROUP_CONTEXT);

      expect([row?.label, row?.contextValue]).toStrictEqual(['tests/smoke.spec.ts', 'turboTask.atomFile']);
    });
  });
});
