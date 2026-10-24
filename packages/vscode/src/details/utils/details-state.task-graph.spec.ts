import type { PackageNode, WorkspaceModel } from '@turbo-console/core';
import type { DetailsState, PackageDetails } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { toDetailsState } from './details-state.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { DetailsInput } from '../common/details.type.ts';
import { A_PACKAGE_STUB, DETAILS_INPUT_STUB, DETAILS_MODEL_STUB, DETAILS_ROOT_STATE_STUB } from '../test/stubs/details-model.stub.ts';

const packageOf = (state: DetailsState): PackageDetails => {
  if (state.kind !== 'package') throw new Error(`expected a package state, got ${state.kind}`);

  return state;
};

const inputFor = (model: WorkspaceModel, packageName: string): DetailsInput => {
  const state: RootState = { ...DETAILS_ROOT_STATE_STUB, model };
  const input: DetailsInput = { ...DETAILS_INPUT_STUB, state, packageName };

  return input;
};

describe('FEATURE: the task graph flag in the details state', () => {
  describe('GIVEN a multi-package model', () => {
    it('WHEN the state builds THEN taskGraph is true', () => {
      const state = packageOf(toDetailsState(DETAILS_INPUT_STUB));

      expect(state.taskGraph).toBe(true);
    });
  });

  describe('GIVEN the single-package // node', () => {
    it('WHEN the state builds THEN taskGraph is false', () => {
      const root: PackageNode = { ...A_PACKAGE_STUB, name: '//', path: '', label: 'single-app' };
      const model: WorkspaceModel = { ...DETAILS_MODEL_STUB, singlePackage: true, packages: [root] };

      const state = packageOf(toDetailsState(inputFor(model, '//')));

      expect(state.taskGraph).toBe(false);
    });
  });
});
