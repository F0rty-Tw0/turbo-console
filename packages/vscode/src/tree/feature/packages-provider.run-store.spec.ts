import { describe, expect, it, vi } from 'vitest';

import { PackagesTreeProvider } from './packages-provider.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { RunDefinition, RunRequest } from '../../run/common/run.type.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { RUN_REQUEST_STUB } from '../../run/test/stubs/run.stub.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { providerDepsOf } from '../test/utils/provider-deps.spec.util.ts';
import { loadedWith, packageNamed, scriptPackageNamed, scriptTaskNamed } from '../test/utils/tree-model.spec.util.ts';

/** `vscode` exists only inside the editor, so the module is replaced here by the class the provider builds. */
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

const S_TASK = scriptTaskNamed('s');

type RunStoreFixture = {
  readonly runs: RunStore;
  readonly provider: PackagesTreeProvider;
  readonly request: RunRequest;
  readonly definition: RunDefinition;
};

/** A provider over a REAL run store, scripts hidden, on a root holding a turbo package `a` and a scripts-only package `s`. */
const runStoreFixtureOf = (): RunStoreFixture => {
  const runs = new RunStore();
  const store = new RootStore();
  const deps = providerDepsOf(runs.get, scriptsToggleMock(), runs.runningIds);
  const provider = new PackagesTreeProvider(store, 'list', 'builtin', deps);
  const request: RunRequest = { ...RUN_REQUEST_STUB, root: ROOT_FOLDER_STUB.root, task: S_TASK };
  const definition: RunDefinition = { root: ROOT_FOLDER_STUB.root, id: S_TASK.id };

  store.set([ROOT_FOLDER_STUB], coordinatorMock);
  store.apply(ROOT_FOLDER_STUB.root, loadedWith([packageNamed('a'), scriptPackageNamed('s')]));

  const fixture: RunStoreFixture = { runs, provider, request, definition };

  return fixture;
};

const keysOf = async (provider: PackagesTreeProvider): Promise<string[]> => {
  const nodes = await provider.getChildren();

  return nodes.map((node) => node.key);
};

describe('FEATURE: packages provider over a real run store', () => {
  describe('GIVEN scripts hidden and a script of s that is not running', () => {
    it('WHEN the tree is read THEN only a is listed', async () => {
      const { provider } = runStoreFixtureOf();

      expect(await keysOf(provider)).toStrictEqual(['a']);
    });

    it('WHEN the script starts THEN s is listed too', async () => {
      const { runs, provider, request } = runStoreFixtureOf();

      await keysOf(provider);
      runs.tryStart(request, 1);

      expect(await keysOf(provider)).toStrictEqual(['a', 's']);
    });
  });

  describe('GIVEN the script of s is running and the tree was read', () => {
    it('WHEN the run ends THEN s is dropped again', async () => {
      const { runs, provider, request, definition } = runStoreFixtureOf();

      runs.tryStart(request, 1);
      await keysOf(provider);
      runs.processEnded(definition, 0, 2);

      expect(await keysOf(provider)).toStrictEqual(['a']);
    });
  });

  describe('GIVEN the script of s ran once and ended', () => {
    it('WHEN it is started again THEN s is listed again', async () => {
      const { runs, provider, request, definition } = runStoreFixtureOf();

      runs.tryStart(request, 1);
      runs.processEnded(definition, 0, 2);
      await keysOf(provider);
      runs.tryStart(request, 3);

      expect(await keysOf(provider)).toStrictEqual(['a', 's']);
    });

    it('WHEN the restart fails to start THEN s is dropped again', async () => {
      const { runs, provider, request, definition } = runStoreFixtureOf();

      runs.tryStart(request, 1);
      runs.processEnded(definition, 0, 2);
      runs.tryStart(request, 3);
      await keysOf(provider);
      runs.failStart(definition, 4);

      expect(await keysOf(provider)).toStrictEqual(['a']);
    });
  });
});
