import type { WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { isSinglePackageWindow } from './single-package-key.util.ts';
import type { RootEntry, RootState } from '../../roots/common/coordinator.type.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';

const SINGLE: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, singlePackage: true };

const MONO: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, singlePackage: false };

const entryOf = (model: WorkspaceModel | null): RootEntry => {
  const state: RootState = { ...ROOT_STATE_STUB, model };
  const entry: RootEntry = { state, coordinator: coordinatorMock() };

  return entry;
};

describe('FEATURE: isSinglePackageWindow', () => {
  describe('GIVEN the roots of a window', () => {
    it.each([
      ['no roots', false, []],
      ['one root with no model', false, [entryOf(null)]],
      ['one single-package root', true, [entryOf(SINGLE)]],
      ['one monorepo root', false, [entryOf(MONO)]],
      ['a single-package root and a monorepo root (mixed multi-root)', false, [entryOf(SINGLE), entryOf(MONO)]],
      ['a monorepo root and a single-package root', false, [entryOf(MONO), entryOf(SINGLE)]],
      ['a single-package root and a root still loading', true, [entryOf(SINGLE), entryOf(null)]],
      ['two single-package roots', true, [entryOf(SINGLE), entryOf(SINGLE)]]
    ])('WHEN the window holds %s THEN singlePackage is %s', (_name, expected, entries) => {
      expect(isSinglePackageWindow(entries)).toBe(expected);
    });
  });
});
