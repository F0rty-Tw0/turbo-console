import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackagesTreeProvider } from './packages-provider.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { TreeNode } from '../common/tree-node.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';

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
    public readonly fire = vi.fn();
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

describe('FEATURE: packages provider clock', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(WALL_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a task launched 12 345 ms before the system clock reading', () => {
    it('WHEN its item is built THEN the elapsed time counts on the system wall clock', async () => {
      const store = new RootStore();
      const provider = new PackagesTreeProvider(store, () => RUNNING, 'list', new Map());

      store.set([ROOT_FOLDER_STUB], coordinatorMock);
      store.apply(ROOT_FOLDER_STUB.root, loadedWith([packageNamed('a')]));
      const pkg = onlyOf(await provider.getChildren());
      const task = onlyOf(await provider.getChildren(pkg));

      const item = provider.getTreeItem(task);

      expect(item.description).toBe('running · 12s');
    });
  });
});
