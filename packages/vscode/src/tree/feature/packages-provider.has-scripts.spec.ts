import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PackagesTreeProvider } from './packages-provider.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { TreeProviderDeps } from '../common/tree-node.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { providerDepsOf } from '../test/utils/provider-deps.spec.util.ts';
import { loadedWith, packageNamed, scriptPackageNamed } from '../test/utils/tree-model.spec.util.ts';

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

describe('FEATURE: packages provider has-scripts key', () => {
  let store: RootStore;
  let setHasScripts: Mock<(value: boolean) => Promise<void>>;
  let provider: PackagesTreeProvider;

  const sent = (): boolean[] => setHasScripts.mock.calls.map(([value]) => value);

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    setHasScripts = vi.fn<(value: boolean) => Promise<void>>(async () => Promise.resolve());
    const base = providerDepsOf();
    const deps: TreeProviderDeps = { ...base, setHasScripts };

    provider = new PackagesTreeProvider(store, 'list', 'builtin', deps);
  });

  describe('GIVEN a provider over one root with no model yet', () => {
    it('WHEN it is built THEN the key is sent false first', () => {
      expect(sent()).toStrictEqual([false]);
    });

    it('WHEN the root then loads a model with a script THEN true follows', () => {
      store.apply(ROOT, loadedWith([scriptPackageNamed('s')]));

      expect(sent()).toStrictEqual([false, true]);
    });
  });

  describe('GIVEN the root has loaded a model with a script', () => {
    beforeEach(() => {
      store.apply(ROOT, loadedWith([scriptPackageNamed('s')]));
    });

    it('WHEN the root leaves the store and rootsChanged runs THEN false follows', () => {
      store.set([], coordinatorMock);

      provider.rootsChanged();

      expect(sent()).toStrictEqual([false, true, false]);
    });

    it('WHEN the provider is disposed THEN a reload without scripts sends nothing', () => {
      provider.dispose();

      store.apply(ROOT, loadedWith([packageNamed('a')]));

      expect(sent()).toStrictEqual([false, true]);
    });
  });
});
