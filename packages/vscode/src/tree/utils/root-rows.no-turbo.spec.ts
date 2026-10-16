import type { WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { rootRows } from './root-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { LoadFailure } from '../../roots/common/root.type.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { TreeMode, TreeRow } from '../common/tree-row.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';
import { packageNamed, scriptPackageNamed } from '../test/utils/tree-model.spec.util.ts';

const MODES: TreeMode[] = ['folders', 'list'];

const LOAD_ERROR: LoadFailure = { ...LOAD_FAILURE_STUB, stage: 'load' };

const stateOf = (model: WorkspaceModel): RootState => {
  const state: RootState = { ...ROOT_STATE_STUB, model };

  return state;
};

const SCRIPTS_ONLY_PACKAGES = [scriptPackageNamed('s'), scriptPackageNamed('t')];

const SCRIPTS_ONLY = stateOf({ ...WORKSPACE_MODEL_STUB, packages: SCRIPTS_ONLY_PACKAGES });

const EMPTY_PACKAGES = [{ ...PACKAGE_NODE_STUB, tasks: [] }];

const NO_TASKS = stateOf({ ...WORKSPACE_MODEL_STUB, packages: EMPTY_PACKAGES });

const MIXED_PACKAGES = [packageNamed('a'), scriptPackageNamed('s')];

const MIXED = stateOf({ ...WORKSPACE_MODEL_STUB, packages: MIXED_PACKAGES });

const hiddenOf = (mode: TreeMode): RowContext => rowContextOf(mode);

const shownOf = (mode: TreeMode): RowContext => rowContextOf(mode, undefined, false, { scriptsShown: true, live: () => new Set() });

const labelsOf = (rows: TreeRow[]): string[] => rows.map((row) => row.label);

describe('FEATURE: the empty state while scripts are hidden', () => {
  describe('GIVEN a model whose packages only have scripts', () => {
    it.each(MODES)('WHEN scripts are hidden in %s mode THEN one row says there are no turbo tasks and where the rest is', (mode) => {
      const rows = rootRows(SCRIPTS_ONLY, hiddenOf(mode));

      expect(rows.map((row) => row.key)).toStrictEqual(['no-turbo-packages']);
      expect(labelsOf(rows)).toStrictEqual(['No turbo tasks. Try Show Scripts.']);
    });

    it.each(MODES)('WHEN scripts are shown in %s mode THEN the packages are listed, no message', (mode) => {
      const rows = rootRows(SCRIPTS_ONLY, shownOf(mode));

      expect(rows.some((row) => row.kind === 'msg')).toBe(false);
    });

    it('WHEN scripts are hidden under a load error THEN the warning comes first, then the no-turbo row', () => {
      const state: RootState = { ...SCRIPTS_ONLY, error: LOAD_ERROR };

      const rows = rootRows(state, hiddenOf('list'));

      expect(rows.map((row) => row.key)).toStrictEqual(['load-with-model', 'no-turbo-packages']);
    });
  });

  describe('GIVEN a model whose packages have no task at all', () => {
    it.each(MODES)('WHEN scripts are hidden in %s mode THEN the old row stays', (mode) => {
      const rows = rootRows(NO_TASKS, hiddenOf(mode));

      expect(labelsOf(rows)).toStrictEqual(['No packages with tasks found.']);
    });

    it('WHEN scripts are shown THEN the old row stays', () => {
      const rows = rootRows(NO_TASKS, shownOf('list'));

      expect(labelsOf(rows)).toStrictEqual(['No packages with tasks found.']);
    });
  });

  describe('GIVEN a model with a turbo package and a scripts-only one', () => {
    it('WHEN scripts are hidden THEN the turbo package is listed, no message', () => {
      const rows = rootRows(MIXED, hiddenOf('list'));

      expect(rows.some((row) => row.kind === 'msg')).toBe(false);
      expect(rows).toHaveLength(1);
    });
  });
});
