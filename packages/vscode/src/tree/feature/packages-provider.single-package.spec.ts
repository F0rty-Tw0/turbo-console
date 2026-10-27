import type { PackageNode, WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PackagesTreeProvider } from './packages-provider.ts';
import type { LoadedModel, RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { TreeProviderDeps } from '../common/tree-node.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { WORKSPACE_MODEL_STUB } from '../test/stubs/workspace-model.stub.ts';
import { providerDepsOf } from '../test/utils/provider-deps.spec.util.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';

/** `vscode` exists only inside the editor, so the module is replaced here by what the provider and its items load with. */
vi.mock('vscode', () => {
  class EventEmitter {
    public readonly event = vi.fn();
    public readonly fire = vi.fn();
    public readonly dispose = vi.fn();
  }

  const collapsibleStates = { None: 0, Collapsed: 1, Expanded: 2 };
  const module = { EventEmitter, TreeItemCollapsibleState: collapsibleStates };

  return module;
});

const ROOT = ROOT_FOLDER_STUB.root;

const OTHER_FOLDER: RootFolder = { root: '/other', name: 'other' };

const singleLoaded = (): LoadedModel => {
  const base = packageNamed('//');
  const rootPackage: PackageNode = { ...base, path: '' };
  const single: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, singlePackage: true, packages: [rootPackage] };
  const loaded = loadedWith([rootPackage]);
  const result: LoadedModel = { ...loaded, model: single };

  return result;
};

describe('FEATURE: packages provider single-package key', () => {
  let store: RootStore;
  let setSinglePackage: Mock<(value: boolean) => Promise<void>>;
  let provider: PackagesTreeProvider;

  const sent = (): boolean[] => setSinglePackage.mock.calls.map(([value]) => value);

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    setSinglePackage = vi.fn<(value: boolean) => Promise<void>>(async () => Promise.resolve());
    const base = providerDepsOf();
    const deps: TreeProviderDeps = { ...base, setSinglePackage };

    provider = new PackagesTreeProvider(store, 'list', 'builtin', deps);
  });

  describe('GIVEN a provider over one root with no model yet', () => {
    it('WHEN it is built THEN false is sent first', () => {
      expect(sent()).toStrictEqual([false]);
    });

    it('WHEN the root loads a single-package model THEN true follows', () => {
      store.apply(ROOT, singleLoaded());

      expect(sent()).toStrictEqual([false, true]);
    });

    it('WHEN a monorepo root joins and loads THEN false follows true and the key is sent only on change', () => {
      store.apply(ROOT, singleLoaded());
      store.set([ROOT_FOLDER_STUB, OTHER_FOLDER], coordinatorMock);
      provider.rootsChanged();
      store.apply(OTHER_FOLDER.root, loadedWith([packageNamed('a')]));

      expect(sent()).toStrictEqual([false, true, false]);
    });

    it('WHEN the provider is disposed THEN later loads send nothing', () => {
      provider.dispose();

      store.apply(ROOT, singleLoaded());

      expect(sent()).toStrictEqual([false]);
    });
  });
});
