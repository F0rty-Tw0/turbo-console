import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTreeProvider } from './packages-provider.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { ICONS_STATE_STUB } from '../test/stubs/icons-state.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { providerDepsOf } from '../test/utils/provider-deps.spec.util.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';

/** Every value the provider's event emitters fired, in order. */
const fired = vi.hoisted((): unknown[] => []);

/** `vscode` exists only inside the editor, so the module is replaced here by what the provider loads with. */
vi.mock('vscode', () => {
  class EventEmitter {
    public readonly event = vi.fn();
    public readonly fire = vi.fn((value: unknown): void => {
      fired.push(value);
    });

    public readonly dispose = vi.fn();
  }

  const collapsibleStates = { None: 0, Collapsed: 1, Expanded: 2 };
  const module = { EventEmitter, TreeItemCollapsibleState: collapsibleStates };

  return module;
});

describe('FEATURE: packages provider cache prediction', () => {
  describe('GIVEN a provider over a loaded root with package a', () => {
    let provider: PackagesTreeProvider;

    beforeEach(() => {
      const store = new RootStore();

      provider = new PackagesTreeProvider(store, 'list', ICONS_STATE_STUB, providerDepsOf());
      store.set([ROOT_FOLDER_STUB], coordinatorMock);
      store.apply(ROOT_FOLDER_STUB.root, loadedWith([packageNamed('a')]));
      fired.length = 0;
    });

    it('WHEN loadsToggled runs THEN the tree event fires once for the whole tree', () => {
      provider.loadsToggled();

      expect(fired).toStrictEqual([undefined]);
    });
  });
});
