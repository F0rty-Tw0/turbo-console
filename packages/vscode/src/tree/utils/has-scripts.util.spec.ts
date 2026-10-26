import type { PackageNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { hasScriptsOf } from './has-scripts.util.ts';
import type { RootEntry, RootState } from '../../roots/common/coordinator.type.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { packageNamed, scriptPackageNamed } from '../test/utils/tree-model.spec.util.ts';
import { ATOM_FILE_TASK } from '../test/utils/tree-refresher.spec.util.ts';

const entryWith = (state: RootState): RootEntry => {
  const entry: RootEntry = { state, coordinator: coordinatorMock() };

  return entry;
};

const entryOf = (packages: PackageNode[]): RootEntry => {
  const model: RootState['model'] = { ...WORKSPACE_MODEL_STUB, packages };
  const state: RootState = { ...ROOT_STATE_STUB, model };

  return entryWith(state);
};

const ATOM_FILE_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [ATOM_FILE_TASK] };

describe('FEATURE: hasScriptsOf (spec 1c-b §4.1 toggle visibility)', () => {
  describe('GIVEN one root with a loaded model', () => {
    it.each([
      ['only turbo tasks', [packageNamed('a')], false],
      ['one script package', [packageNamed('a'), scriptPackageNamed('s')], true],
      ['only an atom-file task', [ATOM_FILE_PACKAGE], false],
      ['no packages', [], false]
    ])('WHEN the model holds %s THEN %s', (_name, packages, expected) => {
      const entries = [entryOf(packages)];

      expect(hasScriptsOf(entries)).toBe(expected);
    });
  });

  describe('GIVEN a root with no model', () => {
    it('WHEN hasScriptsOf reads it THEN false', () => {
      const entries = [entryWith({ ...ROOT_STATE_STUB, model: null })];

      expect(hasScriptsOf(entries)).toBe(false);
    });
  });

  describe('GIVEN two roots and scripts only in the second', () => {
    it('WHEN hasScriptsOf reads them THEN true', () => {
      const entries = [entryOf([packageNamed('a')]), entryOf([scriptPackageNamed('s')])];

      expect(hasScriptsOf(entries)).toBe(true);
    });
  });

  describe('GIVEN no roots', () => {
    it('WHEN hasScriptsOf reads them THEN false', () => {
      expect(hasScriptsOf([])).toBe(false);
    });
  });
});
