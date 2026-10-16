import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { rootRows } from './root-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { LoadFailure } from '../../roots/common/root.type.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { IconSpec, RowCommand, TreeMode, TreeRow } from '../common/tree-row.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { rowContextOf } from '../test/utils/row-context.spec.util.ts';

const INFO_ICON: IconSpec = { id: 'info', color: 'editorInfo.foreground' };
const SHOW_OUTPUT: RowCommand = { command: 'turboConsole.showOutput', args: [] };

const ATOM_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'atom', name: 'atom', kind: 'atom-file' };

const LOAD_ERROR: LoadFailure = { ...LOAD_FAILURE_STUB, stage: 'load' };

const MODES: TreeMode[] = ['folders', 'list'];

const packageAt = (name: string, path: string, tasks: TaskNode[] = [TASK_NODE_STUB]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path, tasks };

  return pkg;
};

const stateOf = (packages: PackageNode[]): RootState => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };
  const state: RootState = { ...ROOT_STATE_STUB, model };

  return state;
};

const HIDDEN_ONLY = stateOf([packageAt('atoms', 'packages/atoms', [ATOM_TASK]), packageAt('configs', 'libs/configs', [])]);

const SCOPED = stateOf([packageAt('b', 'packages/b'), packageAt('@z/a', 'packages/za'), packageAt('@a/z', 'packages/az')]);

const idsOf = (rows: TreeRow[]): string[] => rows.map((row) => row.id);

const labelsOf = (rows: TreeRow[]): string[] => rows.map((row) => row.label);

describe('FEATURE: shown packages of a root', () => {
  describe('GIVEN a model whose packages are all hidden', () => {
    it.each(MODES)('WHEN listed in %s mode THEN one info row says no packages with tasks were found', (mode) => {
      const rows = rootRows(HIDDEN_ONLY, rowContextOf(mode));

      expect(rows).toStrictEqual([
        {
          id: 'msg:/ws\0no-shown-packages',
          kind: 'msg',
          root: '/ws',
          key: 'no-shown-packages',
          packageName: null,
          label: 'No packages with tasks found.',
          description: '',
          icon: INFO_ICON,
          contextValue: 'turboMessage',
          collapsible: 'none',
          tooltip: [],
          command: SHOW_OUTPUT
        }
      ]);
    });

    it('WHEN listed under a load error THEN the warning comes first, then the all-hidden row', () => {
      const state: RootState = { ...HIDDEN_ONLY, error: LOAD_ERROR };

      const rows = rootRows(state, rowContextOf('list'));

      expect(idsOf(rows)).toStrictEqual(['msg:/ws\0load-with-model', 'msg:/ws\0no-shown-packages']);
    });
  });

  describe('GIVEN a model with no packages', () => {
    it('WHEN listed THEN the no-packages row stays', () => {
      const rows = rootRows(stateOf([]), rowContextOf('list'));

      expect(idsOf(rows)).toStrictEqual(['msg:/ws\0no-packages']);
    });
  });

  describe('GIVEN a shown package beside hidden ones', () => {
    const state = stateOf([packageAt('a', 'packages/a'), packageAt('atoms', 'packages/atoms', [ATOM_TASK])]);

    it('WHEN listed in list mode THEN only the shown package has a row', () => {
      const rows = rootRows(state, rowContextOf('list'));

      expect(idsOf(rows)).toStrictEqual(['pkg:/ws\0a']);
    });

    it('WHEN a top-level directory holds only hidden packages THEN it has no row', () => {
      const withWeb = stateOf([packageAt('a', 'packages/a'), packageAt('web', 'apps/web', [])]);

      const rows = rootRows(withWeb, rowContextOf('folders'));

      expect(idsOf(rows)).toStrictEqual(['dir:/ws\0packages']);
    });
  });

  describe('GIVEN scoped and unscoped packages in list mode', () => {
    it.each([false, true])('WHEN the scopes shown is %s THEN the rows are sorted by full name', (scopeShown) => {
      const rows = rootRows(SCOPED, rowContextOf('list', undefined, scopeShown));

      expect(idsOf(rows)).toStrictEqual(['pkg:/ws\0@a/z', 'pkg:/ws\0@z/a', 'pkg:/ws\0b']);
    });

    it('WHEN scopes are hidden THEN each label is the name without its scope', () => {
      const rows = rootRows(SCOPED, rowContextOf('list'));

      expect(labelsOf(rows)).toStrictEqual(['z', 'a', 'b']);
    });

    it('WHEN scopes are shown THEN each label is the full name', () => {
      const rows = rootRows(SCOPED, rowContextOf('list', undefined, true));

      expect(labelsOf(rows)).toStrictEqual(['@a/z', '@z/a', 'b']);
    });

    it.each([false, true])('WHEN the scopes shown is %s THEN key and package name stay raw', (scopeShown) => {
      const rows = rootRows(SCOPED, rowContextOf('list', undefined, scopeShown));

      expect(rows[0]).toMatchObject({ id: 'pkg:/ws\0@a/z', key: '@a/z', packageName: '@a/z' });
    });
  });

  describe('GIVEN a scoped package whose path is its bare name', () => {
    const state = stateOf([packageAt('@s/docs', 'docs')]);

    it('WHEN scopes are hidden THEN the description is empty, since it would repeat the label', () => {
      const rows = rootRows(state, rowContextOf('list'));

      expect(rows[0]?.description).toBe('');
    });

    it('WHEN scopes are shown THEN the description is the path', () => {
      const rows = rootRows(state, rowContextOf('list', undefined, true));

      expect(rows[0]?.description).toBe('docs');
    });
  });
});
