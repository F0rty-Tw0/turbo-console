import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { allRows } from './all-rows.util.ts';
import { childRowsOf, currentRowOf } from './node-rows.util.ts';
import { rootRowOf } from './root-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { LOADING_ICON } from '../common/icon.const.ts';
import type { RowContext, TreeNode } from '../common/tree-node.type.ts';
import type { TreeRow } from '../common/tree-row.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { liveIdsOf } from '../test/utils/live-ids.spec.util.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

const SCRIPT: TaskNode = { ...TASK_NODE_STUB, id: 's#lint', name: 'lint', isTurboTask: false };

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path: `packages/${name}`, tasks };

  return pkg;
};

/** The model is rooted at `/ws`, the folder at `/other`: live sets are keyed by the folder root. */
const MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [packageOf('a', [TASK_NODE_STUB]), packageOf('s', [SCRIPT])] };

const FOLDER: RootFolder = { root: '/other', name: 'other' };

const STATE: RootState = { ...ROOT_STATE_STUB, folder: FOLDER, model: MODEL };

const SCRIPTS_PACKAGE: TreeNode = { kind: 'pkg', id: 'pkg:/other\0s', root: '/other', key: 's', packageName: 's' };

const PACKAGES_DIR: TreeNode = { kind: 'dir', id: 'dir:/other\0packages', root: '/other', key: 'packages', packageName: null };

const contextOf = (liveRoot: string): RowContext => {
  const live = liveIdsOf(liveRoot, 's#lint');
  const context = rowContextOf('folders', undefined, false, { scriptsShown: false, live });

  return context;
};

const idsOf = (rows: TreeRow[]): string[] => rows.map((row) => row.id);

describe('FEATURE: rows keyed by the folder root', () => {
  describe('GIVEN scripts hidden and a model rooted elsewhere than its folder', () => {
    it('WHEN the script is live under the folder root THEN allRows lists the scripts-only package', () => {
      const ids = idsOf(allRows(STATE, contextOf('/other')));

      expect(ids).toContain('pkg:/other\0s');
    });

    it('WHEN the script is live only under the model root THEN allRows has no row for it', () => {
      const ids = idsOf(allRows(STATE, contextOf('/ws')));

      expect(ids).not.toContain('pkg:/other\0s');
    });

    it('WHEN the script is live under the folder root THEN the package has its own row', () => {
      const row = currentRowOf(STATE, SCRIPTS_PACKAGE, contextOf('/other'));

      expect(row.icon).not.toBe(LOADING_ICON);
    });

    it('WHEN the script is live only under the model root THEN the package reads as gone', () => {
      const row = currentRowOf(STATE, SCRIPTS_PACKAGE, contextOf('/ws'));

      expect(row.icon).toBe(LOADING_ICON);
    });

    it('WHEN the script is live under the folder root THEN the directory holds the package', () => {
      const ids = idsOf(childRowsOf(STATE, PACKAGES_DIR, contextOf('/other')));

      expect(ids).toContain('pkg:/other\0s');
    });

    it('WHEN the script is live only under the model root THEN the directory lacks the package', () => {
      const ids = idsOf(childRowsOf(STATE, PACKAGES_DIR, contextOf('/ws')));

      expect(ids).not.toContain('pkg:/other\0s');
    });

    it('WHEN the script is live under the folder root THEN the folder row counts both packages', () => {
      const row = rootRowOf(STATE, contextOf('/other'));

      expect(row.tooltip).toContain('Packages: 2');
    });

    it('WHEN the script is live only under the model root THEN the folder row counts one', () => {
      const row = rootRowOf(STATE, contextOf('/ws'));

      expect(row.tooltip).toContain('Packages: 1');
    });
  });
});
