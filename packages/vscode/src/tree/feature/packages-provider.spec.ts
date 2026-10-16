import type { PackageNode } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTreeProvider } from './packages-provider.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { LiveIds, RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { ScriptsToggleFake } from '../../shared/test/common/scripts-toggle-fake.type.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { TreeNode } from '../common/tree-node.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { liveIdsOf } from '../test/utils/live-ids.spec.util.ts';
import { providerDepsOf } from '../test/utils/provider-deps.spec.util.ts';
import { loadedWith, packageNamed, scriptPackageNamed } from '../test/utils/tree-model.spec.util.ts';

/** Every value the provider's event emitters fired, in order. */
const fired = vi.hoisted((): unknown[] => []);

/** `vscode` exists only inside the editor, so the module is replaced here by the classes the provider builds. */
vi.mock('vscode', () => {
  class TreeItem {
    public readonly label: string;
    public description: string | undefined;

    public constructor(label: string) {
      this.label = label;
    }
  }

  class EventEmitter {
    public readonly event = vi.fn();
    public readonly fire = vi.fn((value: unknown): void => {
      fired.push(value);
    });

    public readonly dispose = vi.fn();
  }

  class ThemeIcon {
    public readonly id: string;

    public constructor(id: string) {
      this.id = id;
    }
  }

  class ThemeColor {
    public readonly id: string;

    public constructor(id: string) {
      this.id = id;
    }
  }

  class MarkdownString {
    public readonly value: string;

    public constructor(value: string) {
      this.value = value;
    }
  }
  const collapsibleStates = { None: 0, Collapsed: 1, Expanded: 2 };
  const module = { TreeItem, EventEmitter, ThemeIcon, ThemeColor, MarkdownString, TreeItemCollapsibleState: collapsibleStates };

  return module;
});

const WALL_NOW = 1_000_000;

const RUNNING: RunEntry = {
  ...RUN_ENTRY_STUB,
  root: ROOT_FOLDER_STUB.root,
  taskId: 'a#build',
  state: 'running',
  launchedAt: WALL_NOW - 12_345
};

const onlyOf = (nodes: TreeNode[]): TreeNode => {
  const [only] = nodes;

  if (only === undefined) throw new Error('no node');

  return only;
};

const S_PACKAGE = scriptPackageNamed('s');

const A_AND_S = [packageNamed('a'), S_PACKAGE];

const S_ONLY = [S_PACKAGE];

const S_WITHOUT_TASKS = [{ ...S_PACKAGE, tasks: [] }];

type ScriptsFixture = {
  readonly store: RootStore;
  readonly provider: PackagesTreeProvider;
  readonly toggle: ScriptsToggleFake;
};

/** A provider over a root holding a turbo package `a` and a scripts-only package `s`, redrawn on store changes like `registerTree` does. */
const scriptsFixtureOf = (live?: LiveIds, packages: PackageNode[] = A_AND_S): ScriptsFixture => {
  const store = new RootStore();
  const toggle = scriptsToggleMock();
  const provider = new PackagesTreeProvider(store, 'list', providerDepsOf(undefined, toggle, live));

  store.set([ROOT_FOLDER_STUB], coordinatorMock);
  store.onDidChange((change) => {
    provider.refreshFor(change);
  });
  store.apply(ROOT_FOLDER_STUB.root, loadedWith(packages));

  const fixture: ScriptsFixture = { store, provider, toggle };

  return fixture;
};

const keysOf = async (provider: PackagesTreeProvider): Promise<string[]> => {
  const nodes = await provider.getChildren();

  return nodes.map((node) => node.key);
};

describe('FEATURE: packages provider', () => {
  describe('GIVEN a shown task a#build', () => {
    it('WHEN the running tasks are refreshed THEN the tree event fires once with that node', async () => {
      const store = new RootStore();
      const provider = new PackagesTreeProvider(store, 'list', providerDepsOf());
      const running = new Map([[ROOT_FOLDER_STUB.root, new Set(['a#build'])]]);

      store.set([ROOT_FOLDER_STUB], coordinatorMock);
      store.apply(ROOT_FOLDER_STUB.root, loadedWith([packageNamed('a')]));
      const pkg = onlyOf(await provider.getChildren());
      const task = onlyOf(await provider.getChildren(pkg));

      fired.length = 0;
      provider.refreshTasks(running);

      expect(fired).toStrictEqual([[task]]);
    });
  });

  describe('GIVEN a task launched 12 345 ms before the system clock reading', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(WALL_NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('WHEN its item is built THEN the elapsed time counts on the system wall clock', async () => {
      const store = new RootStore();
      const provider = new PackagesTreeProvider(
        store,
        'list',
        providerDepsOf(() => RUNNING)
      );

      store.set([ROOT_FOLDER_STUB], coordinatorMock);
      store.apply(ROOT_FOLDER_STUB.root, loadedWith([packageNamed('a')]));
      const pkg = onlyOf(await provider.getChildren());
      const task = onlyOf(await provider.getChildren(pkg));

      const item = provider.getTreeItem(task);

      expect(item.description).toBe('running · 12s');
    });
  });

  describe('GIVEN a turbo package a and a scripts-only package s', () => {
    it('WHEN scripts are hidden THEN only a is listed', async () => {
      const { provider } = scriptsFixtureOf();

      expect(await keysOf(provider)).toStrictEqual(['a']);
    });

    it('WHEN the toggle is set to shown THEN s is listed too, and hidden again drops it', async () => {
      const { provider, toggle } = scriptsFixtureOf();

      await toggle.set(true);

      expect(await keysOf(provider)).toStrictEqual(['a', 's']);

      await toggle.set(false);

      expect(await keysOf(provider)).toStrictEqual(['a']);
    });

    it('WHEN a script of s is running under the root THEN s stays listed while scripts are hidden', async () => {
      const { provider } = scriptsFixtureOf(liveIdsOf(ROOT_FOLDER_STUB.root, 's#lint'));

      expect(await keysOf(provider)).toStrictEqual(['a', 's']);
    });

    it('WHEN a script of s is running under another root THEN s is not listed', async () => {
      const { provider } = scriptsFixtureOf(liveIdsOf('/elsewhere', 's#lint'));

      expect(await keysOf(provider)).toStrictEqual(['a']);
    });

    it('WHEN a reload drops the last turbo task of a while scripts are hidden THEN the whole tree is fired', async () => {
      const { store, provider } = scriptsFixtureOf();

      await keysOf(provider);
      fired.length = 0;
      store.apply(ROOT_FOLDER_STUB.root, loadedWith([scriptPackageNamed('a'), scriptPackageNamed('s')]));

      expect(fired).toStrictEqual([undefined]);
    });

    it('WHEN the same reload comes while scripts are shown THEN only the node of a is fired', async () => {
      const { store, provider, toggle } = scriptsFixtureOf();

      await toggle.set(true);

      const [nodeA] = await provider.getChildren();

      fired.length = 0;
      store.apply(ROOT_FOLDER_STUB.root, loadedWith([scriptPackageNamed('a'), scriptPackageNamed('s')]));

      expect(fired).toStrictEqual([nodeA]);
    });
  });

  describe('GIVEN scripts hidden and no turbo package', () => {
    it('WHEN a reload leaves the package with no task THEN the tree is fired and the message reads no tasks', async () => {
      const { store, provider } = scriptsFixtureOf(undefined, S_ONLY);

      expect(await keysOf(provider)).toStrictEqual(['no-turbo-packages']);

      fired.length = 0;
      store.apply(ROOT_FOLDER_STUB.root, loadedWith(S_WITHOUT_TASKS));

      expect(fired).toStrictEqual([undefined]);
      expect(await keysOf(provider)).toStrictEqual(['no-shown-packages']);
    });

    it('WHEN a reload gives the package a script THEN the tree is fired and the message reads no turbo tasks', async () => {
      const { store, provider } = scriptsFixtureOf(undefined, S_WITHOUT_TASKS);

      expect(await keysOf(provider)).toStrictEqual(['no-shown-packages']);

      fired.length = 0;
      store.apply(ROOT_FOLDER_STUB.root, loadedWith(S_ONLY));

      expect(fired).toStrictEqual([undefined]);
      expect(await keysOf(provider)).toStrictEqual(['no-turbo-packages']);
    });
  });
});
