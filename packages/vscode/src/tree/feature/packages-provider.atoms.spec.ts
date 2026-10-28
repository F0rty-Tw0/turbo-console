import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTreeProvider } from './packages-provider.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { AtomHostPorts } from '../common/atom-load.type.ts';
import type { TreeProviderDeps } from '../common/tree-node.type.ts';
import { sharedAtomsOf } from '../domain-logic/shared-atoms.ts';
import { BASE_SPEC_PATHS, FILE_A, ROOT } from '../test/common/atom-load.const.ts';
import type { ChildrenOf, LoadsHarness } from '../test/common/atom-load.type.ts';
import { ICONS_STATE_STUB } from '../test/stubs/icons-state.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, scanAt } from '../test/utils/atom-load.spec.util.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';
import { loadedOf, umbrellaNodeOf } from '../test/utils/atom-tree.spec.util.ts';
import { providerDepsOf } from '../test/utils/provider-deps.spec.util.ts';

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

describe('FEATURE: packages provider Atomizer loads', () => {
  describe('GIVEN a provider whose group e2e-ci of @fx/e2e was opened', () => {
    let h: LoadsHarness;
    let provider: PackagesTreeProvider;

    beforeEach(async () => {
      h = loadsHarness();

      const store = new RootStore();
      const host: AtomHostPorts = { binaryOf: h.binaryOf, dryRun: h.dryRun, results: h.results, log: h.log };
      const atom = sharedAtomsOf(store, host);
      const base = providerDepsOf();
      const deps: TreeProviderDeps = { ...base, atom };
      const children: ChildrenOf = async (node) => provider.getChildren(node);

      provider = new PackagesTreeProvider(store, 'list', ICONS_STATE_STUB, deps);
      store.set([ROOT_FOLDER_STUB], coordinatorMock);
      store.apply(ROOT, loadedOf(atomModelOf(BASE_SPEC_PATHS)));
      await provider.getChildren(await umbrellaNodeOf(children));
    });

    it('WHEN the provider is disposed THEN the pending dry run is aborted', () => {
      provider.dispose();

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
    });

    it('WHEN Refresh runs after the load settled THEN a second dry run starts', async () => {
      dryRunAt(h, 0).resolve([dryStateOf(FILE_A, 'HIT')]);
      scanAt(h, 0).resolve(new Map());
      await flush();

      provider.refreshAtoms();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });
});
