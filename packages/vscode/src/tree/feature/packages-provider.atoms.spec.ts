import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTreeProvider } from './packages-provider.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { AtomHostPorts } from '../common/atom-load.type.ts';
import type { TreeProviderDeps } from '../common/tree-node.type.ts';
import { FILE_A, ROOT } from '../test/common/atom-loads.const.ts';
import type { ChildrenOf, LoadsHarness } from '../test/common/atom-loads.type.ts';
import { BASE_MODEL_STUB } from '../test/stubs/atom-loads.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { dryRunAt, dryStateOf, flush, loadsHarness, scanAt } from '../test/utils/atom-loads.spec.util.ts';
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
      const atom: AtomHostPorts = { binaryOf: h.binaryOf, dryRun: h.dryRun, results: h.results, log: h.log };
      const base = providerDepsOf();
      const deps: TreeProviderDeps = { ...base, atom };
      const children: ChildrenOf = async (node) => provider.getChildren(node);

      provider = new PackagesTreeProvider(store, 'list', 'builtin', deps);
      store.set([ROOT_FOLDER_STUB], coordinatorMock);
      store.apply(ROOT, loadedOf(BASE_MODEL_STUB));
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
