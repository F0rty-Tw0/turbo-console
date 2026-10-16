import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { refreshTarget } from './refresh-target.util.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';

const SHOWN: RootChange = {
  root: '/ws',
  before: WORKSPACE_MODEL_STUB,
  after: WORKSPACE_MODEL_STUB,
  errorBefore: null,
  errorAfter: null
};

const copyOf = (model: WorkspaceModel): WorkspaceModel => structuredClone(model);

const withChangedScript = (): WorkspaceModel => {
  const task: TaskNode = { ...TASK_NODE_STUB, command: 'tsc -b' };
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [task] };
  const others = WORKSPACE_MODEL_STUB.packages.filter((node) => node.name !== pkg.name);
  const packages = [...others, pkg];
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return model;
};

const withAddedPackage = (): WorkspaceModel => {
  const added: PackageNode = { ...PACKAGE_NODE_STUB, name: 'b', path: 'packages/b' };
  const packages = [...WORKSPACE_MODEL_STUB.packages, added];
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return model;
};

const ATOM_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'atom', name: 'atom', kind: 'atom-file' };

const modelOf = (packages: PackageNode[]): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return model;
};

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, path: `packages/${name}`, tasks };

  return pkg;
};

const SCOPED_UI = packageOf('@a/ui', [TASK_NODE_STUB]);

const HIDDEN_UI = packageOf('ui', [ATOM_TASK]);

const changeOf = (before: PackageNode[], after: PackageNode[]): RootChange => {
  const change: RootChange = { ...SHOWN, before: modelOf(before), after: modelOf(after) };

  return change;
};

describe('FEATURE: refresh target', () => {
  describe('GIVEN a root showing a model with a hidden package', () => {
    it('WHEN the hidden package gains its first visible task THEN the root is redrawn', () => {
      const change = changeOf([HIDDEN_UI], [packageOf('ui', [TASK_NODE_STUB])]);

      const target = refreshTarget(change);

      expect(target).toBe('root');
    });

    it('WHEN an unscoped package sharing a shown scoped name becomes shown THEN the root is redrawn', () => {
      const change = changeOf([SCOPED_UI, HIDDEN_UI], [SCOPED_UI, packageOf('ui', [ATOM_TASK, TASK_NODE_STUB])]);

      const target = refreshTarget(change);

      expect(target).toBe('root');
    });

    it('WHEN an unscoped package sharing a shown scoped name is added THEN the root is redrawn', () => {
      const change = changeOf([SCOPED_UI], [SCOPED_UI, packageOf('ui', [TASK_NODE_STUB])]);

      const target = refreshTarget(change);

      expect(target).toBe('root');
    });

    it('WHEN the hidden package changes and stays hidden THEN only that package is redrawn', () => {
      const edited: TaskNode = { ...ATOM_TASK, command: 'edited' };
      const change = changeOf([SCOPED_UI, HIDDEN_UI], [SCOPED_UI, packageOf('ui', [edited])]);

      const target = refreshTarget(change);

      expect(target).toStrictEqual(['ui']);
    });

    it('WHEN the visible task of the shown package changes THEN only that package is redrawn', () => {
      const edited: TaskNode = { ...TASK_NODE_STUB, command: 'edited' };
      const change = changeOf([SCOPED_UI, HIDDEN_UI], [packageOf('@a/ui', [edited]), HIDDEN_UI]);

      const target = refreshTarget(change);

      expect(target).toStrictEqual(['@a/ui']);
    });
  });

  describe('GIVEN a root showing a model', () => {
    it('WHEN a binary error comes in with the same model kept THEN the root is redrawn', () => {
      const change: RootChange = { ...SHOWN, errorAfter: 'binary:not-found' };

      const target = refreshTarget(change);

      expect(target).toBe('root');
    });

    it('WHEN a load error comes in with the model kept THEN the root is redrawn', () => {
      const change: RootChange = { ...SHOWN, errorAfter: 'load:failed' };

      const target = refreshTarget(change);

      expect(target).toBe('root');
    });

    it('WHEN the model goes away THEN the root is redrawn', () => {
      const change: RootChange = { ...SHOWN, after: null };

      const target = refreshTarget(change);

      expect(target).toBe('root');
    });

    it('WHEN a package is added THEN the root is redrawn', () => {
      const change: RootChange = { ...SHOWN, after: withAddedPackage() };

      const target = refreshTarget(change);

      expect(target).toBe('root');
    });

    it("WHEN one package's script changes with no errors THEN only that package is redrawn", () => {
      const change: RootChange = { ...SHOWN, after: withChangedScript() };

      const target = refreshTarget(change);

      expect(target).toStrictEqual(['a']);
    });

    it('WHEN an identical model comes in with no errors THEN nothing is redrawn', () => {
      const change: RootChange = { ...SHOWN, after: copyOf(WORKSPACE_MODEL_STUB) };

      const target = refreshTarget(change);

      expect(target).toStrictEqual([]);
    });
  });

  describe('GIVEN a root showing a model under a load error', () => {
    it('WHEN a model identical to the shown one clears the error THEN the root is redrawn', () => {
      const change: RootChange = { ...SHOWN, after: copyOf(WORKSPACE_MODEL_STUB), errorBefore: 'load:failed' };

      const target = refreshTarget(change);

      expect(target).toBe('root');
    });
  });

  describe('GIVEN a root in a binary error', () => {
    it('WHEN the error kind changes THEN the root is redrawn', () => {
      const change: RootChange = {
        ...SHOWN,
        errorBefore: 'binary:not-found',
        errorAfter: 'binary:version-unsupported'
      };

      const target = refreshTarget(change);

      expect(target).toBe('root');
    });
  });

  describe('GIVEN a root with nothing shown yet', () => {
    it('WHEN its first model comes in THEN the root is redrawn', () => {
      const change: RootChange = { ...SHOWN, before: null };

      const target = refreshTarget(change);

      expect(target).toBe('root');
    });
  });
});
