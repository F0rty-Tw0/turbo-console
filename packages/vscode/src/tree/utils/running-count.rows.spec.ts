import { describe, expect, it } from 'vitest';

import { allRows } from './all-rows.util.ts';
import { childRowsOf, currentRowOf } from './node-rows.util.ts';
import { rootRowOf, rootRows } from './root-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { LiveIds, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { RowContext, TreeNode } from '../common/tree-node.type.ts';
import type { TreeMode, TreeRow } from '../common/tree-row.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';
import { liveIdsOf } from '../test/utils/live-ids.spec.util.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

/** Package `a` (`packages/a`) of the stub model runs `a#build`; a run of `gone#build` belongs to no package of it. */
const runs: RunLookup = (_root, taskId) => (taskId === 'a#build' ? RUN_ENTRY_STUB : undefined);

const PACKAGES_DIR_NODE: TreeNode = { kind: 'dir', id: 'dir:/ws\0packages', root: '/ws', key: 'packages', packageName: null };

const contextOf = (mode: TreeMode, live: LiveIds = liveIdsOf('/ws', 'a#build'), scriptsShown = false): RowContext =>
  rowContextOf(mode, runs, false, { scriptsShown, live });

const descriptionOf = (rows: TreeRow[], id: string): string | undefined => {
  const found = rows.find((row) => row.id === id);

  return found?.description;
};

describe('FEATURE: running counts through the row builders', () => {
  describe('GIVEN package a of the stub model running one task', () => {
    it('WHEN the list view lists the root THEN only the row of a carries the count', () => {
      const rows = rootRows(ROOT_STATE_STUB, contextOf('list'));

      expect(rows.map((row) => row.description)).toStrictEqual(['packages/libs/x', 'packages/a · 1 running', 'apps/web']);
    });

    it('WHEN the folders view lists the root THEN only folder packages carries the count', () => {
      const rows = rootRows(ROOT_STATE_STUB, contextOf('folders'));

      expect(rows.map((row) => [row.key, row.description])).toStrictEqual([
        ['apps', ''],
        ['packages', '1 running']
      ]);
    });

    it('WHEN folder packages is expanded THEN the row of a carries the count', () => {
      const rows = childRowsOf(ROOT_STATE_STUB, PACKAGES_DIR_NODE, contextOf('folders'));

      expect(descriptionOf(rows, TREE_NODE_STUB.id)).toBe('packages/a · 1 running');
    });

    it('WHEN the row of folder packages is rebuilt THEN it carries the count', () => {
      const row = currentRowOf(ROOT_STATE_STUB, PACKAGES_DIR_NODE, contextOf('folders'));

      expect(row.description).toBe('1 running');
    });

    it('WHEN the row of a is rebuilt THEN it carries the count', () => {
      const row = currentRowOf(ROOT_STATE_STUB, TREE_NODE_STUB, contextOf('folders'));

      expect(row.description).toBe('packages/a · 1 running');
    });

    it('WHEN every row is read for the bench THEN the row of a carries the count', () => {
      const rows = allRows(ROOT_STATE_STUB, contextOf('folders'));

      expect(descriptionOf(rows, TREE_NODE_STUB.id)).toBe('packages/a · 1 running');
    });

    it('WHEN scripts are shown THEN the row of a still carries the count', () => {
      const rows = rootRows(ROOT_STATE_STUB, contextOf('list', liveIdsOf('/ws', 'a#build'), true));

      expect(descriptionOf(rows, TREE_NODE_STUB.id)).toBe('packages/a · 1 running');
    });
  });

  describe('GIVEN a multi-root row', () => {
    it('WHEN its root runs a#build and a task gone from the model THEN it counts both', () => {
      const row = rootRowOf(ROOT_STATE_STUB, contextOf('folders', liveIdsOf('/ws', 'a#build', 'gone#build')));

      expect(row.description).toBe('2 running');
    });

    it('WHEN its root has no model yet and runs one task THEN it counts it', () => {
      const loading: RootState = { ...ROOT_STATE_STUB, model: null };

      const row = rootRowOf(loading, contextOf('folders'));

      expect(row.description).toBe('1 running');
    });

    it('WHEN only another root runs THEN the description stays empty', () => {
      const row = rootRowOf(ROOT_STATE_STUB, contextOf('folders', liveIdsOf('/other', 'a#build')));

      expect(row.description).toBe('');
    });
  });
});
