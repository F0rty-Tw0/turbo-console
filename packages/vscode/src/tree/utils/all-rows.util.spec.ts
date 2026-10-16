import type { PackageNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { allRows } from './all-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { LoadFailure } from '../../roots/common/root.type.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { TreeRow } from '../common/tree-row.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { ROW_NOW, rowContextOf } from '../test/utils/row-context.spec.util.ts';

const packageWithBuild = (name: string, path: string): PackageNode => {
  const task = { ...TASK_NODE_STUB, id: `${name}#build` };
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path, tasks: [task] };

  return pkg;
};

const PACKAGES = [
  packageWithBuild('web', 'apps/web'),
  packageWithBuild('a', 'packages/a'),
  packageWithBuild('@org/x', 'packages/libs/x')
];

const MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: PACKAGES };

const STATE: RootState = { ...ROOT_STATE_STUB, model: MODEL };

const LOAD_ERROR: LoadFailure = { ...LOAD_FAILURE_STUB, stage: 'load' };

const sortedIds = (rows: TreeRow[]): string[] => {
  const ids = rows.map((row) => row.id);

  return ids.sort();
};

const runOfA: RunLookup = (root, taskId) => {
  if (taskId !== 'a#build') return undefined;

  const entry: RunEntry = { ...RUN_ENTRY_STUB, root, launchedAt: ROW_NOW - 12_345 };

  return entry;
};

describe('FEATURE: every row of a root', () => {
  describe('GIVEN a model of three packages in nested directories', () => {
    it('WHEN listed in folders mode THEN directories, packages and tasks are all there, once each', () => {
      const rows = allRows(STATE, rowContextOf('folders'));

      expect(sortedIds(rows)).toStrictEqual([
        'dir:/ws\0apps',
        'dir:/ws\0packages',
        'dir:/ws\0packages/libs',
        'pkg:/ws\0@org/x',
        'pkg:/ws\0a',
        'pkg:/ws\0web',
        'task:/ws\0@org/x#build',
        'task:/ws\0a#build',
        'task:/ws\0web#build'
      ]);
    });

    it('WHEN listed in list mode THEN packages and tasks are there and no directory is', () => {
      const rows = allRows(STATE, rowContextOf('list'));

      expect(sortedIds(rows)).toStrictEqual([
        'pkg:/ws\0@org/x',
        'pkg:/ws\0a',
        'pkg:/ws\0web',
        'task:/ws\0@org/x#build',
        'task:/ws\0a#build',
        'task:/ws\0web#build'
      ]);
    });

    it('WHEN a run is recorded for a task THEN its row shows the run state', () => {
      const rows = allRows(STATE, rowContextOf('list', runOfA));
      const tasks = rows.filter((row) => row.kind === 'task');
      const descriptions = tasks.map((row) => row.description);

      expect(descriptions.sort()).toStrictEqual(['', '', 'running · 12s']);
    });
  });

  describe('GIVEN a load error while a model is shown', () => {
    it('WHEN listed THEN the warning and every directory, package and task row are there', () => {
      const state: RootState = { ...STATE, error: LOAD_ERROR };

      const rows = allRows(state, rowContextOf('folders'));

      expect(sortedIds(rows)).toStrictEqual([
        'dir:/ws\0apps',
        'dir:/ws\0packages',
        'dir:/ws\0packages/libs',
        'msg:/ws\0load-with-model',
        'pkg:/ws\0@org/x',
        'pkg:/ws\0a',
        'pkg:/ws\0web',
        'task:/ws\0@org/x#build',
        'task:/ws\0a#build',
        'task:/ws\0web#build'
      ]);
    });
  });

  describe('GIVEN a binary error', () => {
    it('WHEN listed THEN only the error row is there, though a model is shown', () => {
      const state: RootState = { ...STATE, error: LOAD_FAILURE_STUB };

      const rows = allRows(state, rowContextOf('folders'));

      expect(sortedIds(rows)).toStrictEqual(['msg:/ws\0binary-not-found']);
    });
  });

  describe('GIVEN no model yet', () => {
    it('WHEN listed THEN only the loading row is there', () => {
      const state: RootState = { ...STATE, model: null };

      const rows = allRows(state, rowContextOf('folders'));

      expect(sortedIds(rows)).toStrictEqual(['msg:/ws\0loading']);
    });
  });
});
