import type { PackageNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { diffModels } from './model-diff.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';

const withPackages = (packages: PackageNode[]): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return model;
};

const patched = (pkg: PackageNode, change: Partial<PackageNode>): PackageNode => {
  const node: PackageNode = { ...pkg, ...change };

  return node;
};

const replaced = (name: string, change: Partial<PackageNode>): PackageNode[] => {
  const swap = (pkg: PackageNode): PackageNode => {
    if (pkg.name !== name) return pkg;

    return patched(pkg, change);
  };

  return WORKSPACE_MODEL_STUB.packages.map(swap);
};

describe('FEATURE: model diff', () => {
  describe('GIVEN two deep-equal models that are different objects', () => {
    it('WHEN diffed THEN nothing is structural or changed', () => {
      const after = structuredClone(WORKSPACE_MODEL_STUB);

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff).toStrictEqual({ structural: false, changed: [] });
    });
  });

  describe('GIVEN one package whose task changed', () => {
    it('WHEN diffed THEN only that name is changed and the diff is not structural', () => {
      const edited = { ...TASK_NODE_STUB, description: 'changed' };
      const after = withPackages(replaced('a', { tasks: [edited] }));

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff).toStrictEqual({ structural: false, changed: ['a'] });
    });
  });

  describe('GIVEN a package whose tags changed', () => {
    it('WHEN diffed THEN the tag change counts as a change', () => {
      const after = withPackages(replaced('web', { tags: ['ui'] }));

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff).toStrictEqual({ structural: false, changed: ['web'] });
    });
  });

  describe('GIVEN several changed packages', () => {
    it('WHEN diffed THEN the names are sorted', () => {
      const retagged = replaced('web', { tags: ['ui'] });
      const retagA = (pkg: PackageNode): PackageNode => {
        if (pkg.name !== 'a') return pkg;

        return patched(pkg, { tags: ['lib'] });
      };
      const after = withPackages(retagged.map(retagA));

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff.changed).toStrictEqual(['a', 'web']);
    });
  });

  describe('GIVEN a package added', () => {
    it('WHEN diffed THEN the diff is structural and the new name is not in changed', () => {
      const added = { ...PACKAGE_NODE_STUB, name: 'new', path: 'packages/new' };
      const after = withPackages([...WORKSPACE_MODEL_STUB.packages, added]);

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff).toStrictEqual({ structural: true, changed: [] });
    });

    it('WHEN another package also changed THEN that one is still listed', () => {
      const added = { ...PACKAGE_NODE_STUB, name: 'new', path: 'packages/new' };
      const edited = replaced('web', { tags: ['ui'] });
      const after = withPackages([...edited, added]);

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff).toStrictEqual({ structural: true, changed: ['web'] });
    });
  });

  describe('GIVEN a package removed', () => {
    it('WHEN diffed THEN the diff is structural', () => {
      const after = withPackages(WORKSPACE_MODEL_STUB.packages.slice(1));

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff).toStrictEqual({ structural: true, changed: [] });
    });
  });

  describe('GIVEN one package replaced by another, so the count is equal', () => {
    it('WHEN diffed THEN the diff is structural', () => {
      const renamed = replaced('a', { name: 'renamed' });
      const after = withPackages(renamed);

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff.structural).toBe(true);
    });
  });

  describe('GIVEN a package removed while another name appears twice, so the count is equal', () => {
    it('WHEN diffed THEN the diff is structural', () => {
      const webAndA = WORKSPACE_MODEL_STUB.packages.slice(0, 2);
      const after = withPackages([...webAndA, PACKAGE_NODE_STUB]);

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff.structural).toBe(true);
    });
  });

  describe('GIVEN a package whose path changed', () => {
    it('WHEN diffed THEN the diff is structural and the name is also changed', () => {
      const after = withPackages(replaced('a', { path: 'libs/a' }));

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff).toStrictEqual({ structural: true, changed: ['a'] });
    });
  });

  describe('GIVEN no model before', () => {
    it('WHEN diffed THEN the diff is structural with nothing listed as changed', () => {
      const diff = diffModels(null, WORKSPACE_MODEL_STUB);

      expect(diff).toStrictEqual({ structural: true, changed: [] });
    });
  });

  describe('GIVEN a change outside the packages', () => {
    it('WHEN diffed THEN it is not a package change', () => {
      const after: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, warnings: ['w'] };

      const diff = diffModels(WORKSPACE_MODEL_STUB, after);

      expect(diff).toStrictEqual({ structural: false, changed: [] });
    });
  });
});
