import { TurboException } from '@turbo-console/core';
import type { PackageNode, TurboErrorKind } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { rootNodeRow, rootRows } from './root-rows.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { LoadFailure } from '../../roots/common/root.type.ts';
import type { IconSpec, RowCommand, TreeRow } from '../common/tree-row.type.ts';
import { ROOT_FOLDER_STUB, ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';

const BIDI = String.fromCodePoint(0x202e);

const ERROR_ICON: IconSpec = { id: 'error', color: 'errorForeground' };
const WARNING_ICON: IconSpec = { id: 'warning', color: 'editorWarning.foreground' };
const INFO_ICON: IconSpec = { id: 'info', color: 'editorInfo.foreground' };
const LOADING_ICON: IconSpec = { id: 'loading~spin', color: null };
const PACKAGE_ICON: IconSpec = { id: 'package', color: null };
const ROOT_FOLDER_ICON: IconSpec = { id: 'root-folder', color: null };
const SHOW_OUTPUT: RowCommand = { command: 'turboConsole.showOutput', args: [] };

const NOT_FOUND_TEXT = "turbo not found. Install the workspace's dependencies or set turboConsole.turboPath.";
const VERSION_TEXT = 'This turbo version is not supported (needs >=2.11.7 <2.12.0). See Output.';

const failureOf = (stage: LoadFailure['stage'], kind: TurboErrorKind): LoadFailure => {
  const error = new TurboException(kind, 'secret detail');
  const failure: LoadFailure = { kind: 'error', stage, error };

  return failure;
};

const stateWith = (overrides: Partial<RootState>): RootState => {
  const state: RootState = { ...ROOT_STATE_STUB, ...overrides };

  return state;
};

const packageAt = (name: string, path: string): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, path };

  return node;
};

const modelOf = (packages: PackageNode[]): RootState['model'] => {
  const model: RootState['model'] = { ...WORKSPACE_MODEL_STUB, packages };

  return model;
};

const idsOf = (rows: TreeRow[]): string[] => rows.map((row) => row.id);

const labelsOf = (rows: TreeRow[]): string[] => rows.map((row) => row.label);

describe('FEATURE: rows of a root', () => {
  describe('GIVEN a binary error', () => {
    it('WHEN the kind is not-found THEN one error row with the install text replaces everything', () => {
      const state = stateWith({ error: failureOf('binary', 'not-found') });

      const rows = rootRows(state, 'folders');

      expect(rows).toStrictEqual([
        {
          id: 'msg:/ws\0binary-not-found',
          kind: 'msg',
          root: '/ws',
          key: 'binary-not-found',
          packageName: null,
          label: NOT_FOUND_TEXT,
          description: '',
          icon: ERROR_ICON,
          contextValue: 'turboMessage',
          collapsible: 'none',
          tooltip: [],
          command: SHOW_OUTPUT
        }
      ]);
    });

    it('WHEN the kind is version-unsupported THEN the row names the supported range and not the found version', () => {
      const state = stateWith({ error: failureOf('binary', 'version-unsupported') });

      const rows = rootRows(state, 'folders');

      expect(labelsOf(rows)).toStrictEqual([VERSION_TEXT]);
    });

    it('WHEN the kind is version-unsupported THEN the row is an error with the show-output command', () => {
      const state = stateWith({ error: failureOf('binary', 'version-unsupported') });

      const rows = rootRows(state, 'folders');

      expect(rows).toMatchObject([{ id: 'msg:/ws\0binary-version', icon: ERROR_ICON, command: SHOW_OUTPUT }]);
    });

    it.each<TurboErrorKind>(['invalid-argument', 'invalid-output', 'io', 'failed'])(
      'WHEN the kind is %s THEN the row is the generic binary text',
      (kind) => {
        const state = stateWith({ error: failureOf('binary', kind) });

        const rows = rootRows(state, 'folders');

        expect(labelsOf(rows)).toStrictEqual(["Couldn't find a usable turbo. See Output."]);
      }
    );

    it('WHEN the kind is io THEN the generic row is an error with the show-output command', () => {
      const state = stateWith({ error: failureOf('binary', 'io') });

      const rows = rootRows(state, 'folders');

      expect(rows).toMatchObject([{ id: 'msg:/ws\0binary-other', icon: ERROR_ICON, command: SHOW_OUTPUT }]);
    });

    it('WHEN a model is shown too THEN the model rows are not listed', () => {
      const state = stateWith({ error: failureOf('binary', 'not-found'), model: WORKSPACE_MODEL_STUB });

      const rows = rootRows(state, 'list');

      expect(idsOf(rows)).toStrictEqual(['msg:/ws\0binary-not-found']);
    });

    it('WHEN the exception message is secret THEN no label shows it', () => {
      const state = stateWith({ error: failureOf('binary', 'failed') });

      const rows = rootRows(state, 'folders');

      expect(labelsOf(rows).join()).not.toContain('secret detail');
    });
  });

  describe('GIVEN a load error and no model', () => {
    it.each<TurboErrorKind>(['failed', 'not-found', 'io'])('WHEN the kind is %s THEN one load-error row', (kind) => {
      const state = stateWith({ error: failureOf('load', kind), model: null });

      const rows = rootRows(state, 'folders');

      expect(labelsOf(rows)).toStrictEqual(["Couldn't load the workspace. See Output."]);
    });

    it('WHEN listed THEN the row is an error icon with the show-output command', () => {
      const state = stateWith({ error: failureOf('load', 'failed'), model: null });

      const rows = rootRows(state, 'folders');

      expect(rows).toMatchObject([{ id: 'msg:/ws\0load-no-model', icon: ERROR_ICON, command: SHOW_OUTPUT }]);
    });
  });

  describe('GIVEN a load error and a shown model', () => {
    it('WHEN listed in list mode THEN the warning row comes first, then the packages', () => {
      const state = stateWith({ error: failureOf('load', 'failed') });

      const rows = rootRows(state, 'list');

      expect(idsOf(rows)).toStrictEqual(['msg:/ws\0load-with-model', 'pkg:/ws\0@org/x', 'pkg:/ws\0a', 'pkg:/ws\0web']);
    });

    it('WHEN listed THEN the warning has its text, icon and command', () => {
      const state = stateWith({ error: failureOf('load', 'failed') });

      const rows = rootRows(state, 'list');

      expect(rows[0]).toMatchObject({
        kind: 'msg',
        label: 'Showing cached data: reload failed. See Output.',
        icon: WARNING_ICON,
        command: SHOW_OUTPUT
      });
    });

    it('WHEN the model has no packages THEN the warning comes first, then the no-packages row', () => {
      const state = stateWith({ error: failureOf('load', 'failed'), model: modelOf([]) });

      const rows = rootRows(state, 'list');

      expect(idsOf(rows)).toStrictEqual(['msg:/ws\0load-with-model', 'msg:/ws\0no-packages']);
    });
  });

  describe('GIVEN a model with no packages and no error', () => {
    it('WHEN listed THEN one info row says no packages were found', () => {
      const state = stateWith({ model: modelOf([]) });

      const rows = rootRows(state, 'folders');

      expect(rows).toMatchObject([{ id: 'msg:/ws\0no-packages', label: 'No packages found.', icon: INFO_ICON, command: SHOW_OUTPUT }]);
    });
  });

  describe('GIVEN no model and no error', () => {
    it('WHEN listed THEN one spinning loading row', () => {
      const state = stateWith({ model: null });

      const rows = rootRows(state, 'folders');

      expect(rows).toMatchObject([
        {
          id: 'msg:/ws\0loading',
          kind: 'msg',
          label: 'Loading…',
          icon: LOADING_ICON,
          contextValue: 'turboMessage',
          collapsible: 'none',
          command: SHOW_OUTPUT
        }
      ]);
    });
  });

  describe('GIVEN a model and no error', () => {
    it('WHEN listed in list mode THEN the package rows are flat and sorted by name', () => {
      const rows = rootRows(ROOT_STATE_STUB, 'list');

      expect(idsOf(rows)).toStrictEqual(['pkg:/ws\0@org/x', 'pkg:/ws\0a', 'pkg:/ws\0web']);
    });

    it('WHEN listed in list mode THEN package rows carry the raw name, the path and a collapsed state', () => {
      const rows = rootRows(stateWith({ model: modelOf([PACKAGE_NODE_STUB]) }), 'list');

      expect(rows).toStrictEqual([
        {
          id: 'pkg:/ws\0a',
          kind: 'pkg',
          root: '/ws',
          key: 'a',
          packageName: 'a',
          label: 'a',
          description: 'packages/a',
          icon: PACKAGE_ICON,
          contextValue: 'turboPackage',
          collapsible: 'collapsed',
          tooltip: [],
          command: null
        }
      ]);
    });

    it('WHEN listed in folders mode THEN the top level holds directory rows, expanded', () => {
      const rows = rootRows(ROOT_STATE_STUB, 'folders');

      expect(rows).toMatchObject([
        { id: 'dir:/ws\0apps', kind: 'dir', key: 'apps', packageName: null, label: 'apps', collapsible: 'expanded' },
        { id: 'dir:/ws\0packages', kind: 'dir', key: 'packages', packageName: null, label: 'packages', collapsible: 'expanded' }
      ]);
    });

    it('WHEN listed in folders mode THEN the top level lists directory rows before package rows', () => {
      const packages = [packageAt('aaa', 'aaa'), packageAt('a', 'packages/a')];

      const rows = rootRows(stateWith({ model: modelOf(packages) }), 'folders');

      expect(idsOf(rows)).toStrictEqual(['dir:/ws\0packages', 'pkg:/ws\0aaa']);
    });

    it('WHEN a package label holds a bidi control THEN the label is cleaned and the key and id keep the raw name', () => {
      const name = `a${BIDI}b`;
      const packages = [packageAt(name, 'p/a')];

      const rows = rootRows(stateWith({ model: modelOf(packages) }), 'list');

      expect(rows).toMatchObject([{ id: `pkg:/ws\0${name}`, key: name, packageName: name, label: 'ab' }]);
    });
  });
});

describe('FEATURE: row of a workspace folder', () => {
  describe('GIVEN a folder of a multi-root window', () => {
    it('WHEN built THEN it is an expanded root-folder row', () => {
      const row = rootNodeRow(ROOT_FOLDER_STUB);

      expect(row).toStrictEqual({
        id: 'root:/ws',
        kind: 'root',
        root: '/ws',
        key: '/ws',
        packageName: null,
        label: 'ws',
        description: '',
        icon: ROOT_FOLDER_ICON,
        contextValue: 'turboRoot',
        collapsible: 'expanded',
        tooltip: [],
        command: null
      });
    });

    it('WHEN the folder name holds a bidi control THEN the label is cleaned and the key keeps the path', () => {
      const root = `/w${BIDI}s`;

      const row = rootNodeRow({ root, name: `w${BIDI}s` });

      expect(row).toMatchObject({ id: `root:${root}`, key: root, label: 'ws' });
    });
  });
});
