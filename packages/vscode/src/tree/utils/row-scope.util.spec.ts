import type { WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { rowScopeOf } from './row-scope.util.ts';
import type { RowScope } from '../common/tree-row.type.ts';
import { PACKAGE_MANAGER_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';

describe('FEATURE: the scope of a root over its model', () => {
  describe('GIVEN a root key that differs from the resolved model root', () => {
    it('WHEN the scope is made THEN it keys on the root it is given', () => {
      const scope = rowScopeOf('/link', WORKSPACE_MODEL_STUB);

      expect(scope.root).toBe('/link');
    });
  });

  describe.each([true, false])('GIVEN a model with singlePackage %s', (singlePackage) => {
    it('WHEN the scope is made THEN it carries the model package manager and singlePackage', () => {
      const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, singlePackage };

      const scope = rowScopeOf('/ws', model);

      expect(scope).toStrictEqual<RowScope>({ root: '/ws', packageManager: PACKAGE_MANAGER_STUB, singlePackage });
    });
  });
});
