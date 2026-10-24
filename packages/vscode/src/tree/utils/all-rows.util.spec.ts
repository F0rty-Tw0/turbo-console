import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { allRows } from './all-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { LoadFailure } from '../../roots/common/root.type.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { TreeRow } from '../common/tree-row.type.ts';
import { ATOM_MODEL_STUB, ATOM_VIEW_STUB } from '../test/stubs/atom-view.stub.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { atomContextOf } from '../test/utils/atom-context.spec.util.ts';
import { liveIdsOf } from '../test/utils/live-ids.spec.util.ts';
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

  describe('GIVEN a package with a turbo task and two scripts', () => {
    const build: TaskNode = { ...TASK_NODE_STUB, id: 'a#build' };
    const lint: TaskNode = { ...TASK_NODE_STUB, id: 'a#lint', name: 'lint', isTurboTask: false };
    const fmt: TaskNode = { ...lint, id: 'a#fmt', name: 'fmt' };
    const tasks = [build, lint, fmt];
    const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks };
    const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [pkg] };
    const state: RootState = { ...ROOT_STATE_STUB, model };
    const idsWith = (scriptsShown: boolean, ...live: string[]): string[] => {
      const context = rowContextOf('list', undefined, false, { scriptsShown, live: liveIdsOf('/ws', ...live) });
      const ids = sortedIds(allRows(state, context));

      return ids.filter((id) => id.startsWith('scripts:') || id.includes('#lint') || id.includes('#fmt'));
    };

    it('WHEN scripts are shown THEN the group and both script rows are listed', () => {
      expect(idsWith(true)).toStrictEqual(['scripts:/ws\0a', 'task:/ws\0a#fmt', 'task:/ws\0a#lint']);
    });

    it('WHEN scripts are shown THEN each task and script id appears exactly once', () => {
      const context = rowContextOf('list', undefined, false, { scriptsShown: true, live: liveIdsOf('/ws') });
      const ids = allRows(state, context).map((row) => row.id);
      const countOf = (id: string): number => ids.filter((each) => each === id).length;
      const taskIds = tasks.map((task) => `task:/ws\0${task.id}`);

      expect(taskIds.map(countOf)).toStrictEqual([1, 1, 1]);
    });

    it('WHEN scripts are hidden and none is live THEN neither the group nor a script is listed', () => {
      expect(idsWith(false)).toStrictEqual([]);
    });

    it('WHEN scripts are hidden and one is live THEN the group and the live script alone are listed', () => {
      expect(idsWith(false, 'a#lint')).toStrictEqual(['scripts:/ws\0a', 'task:/ws\0a#lint']);
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

describe('FEATURE: every row of a root holding Atomizer groups', () => {
  describe('GIVEN package e2e with a group of three files', () => {
    const state: RootState = { ...ROOT_STATE_STUB, model: ATOM_MODEL_STUB };

    it('WHEN listed THEN each file row is there once and the aggregate is not', () => {
      const rows = allRows(state, atomContextOf(ATOM_VIEW_STUB));
      const ids = sortedIds(rows);

      expect(ids).toContain('task:/ws\0e2e#e2e-ci--tests/a.spec.ts');
      expect(ids).toContain('task:/ws\0e2e#e2e-ci--tests/b fails.spec.ts');
      expect(ids).toContain('task:/ws\0e2e#e2e-ci--tests/live.spec.ts');
      expect(ids).not.toContain('task:/ws\0e2e#e2e-ci--all');
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
