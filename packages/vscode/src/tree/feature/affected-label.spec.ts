import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Disposable, TreeView } from 'vscode';

import { followAffectedLabel } from './affected-label.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { ScriptsToggleFake } from '../../shared/test/common/scripts-toggle-fake.type.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { PackagesTreeApi, TreeNode } from '../common/tree-node.type.ts';
import type { SharedAffectedFake } from '../test/common/shared-affected-fake.type.ts';
import { packagesTreeApiMock } from '../test/mocks/packages-tree-api.mock.ts';
import { sharedAffectedMock } from '../test/mocks/shared-affected.mock.ts';
import { AFFECTED_VIEW_STUB } from '../test/stubs/affected-view.stub.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';

type LabelView = Pick<TreeView<TreeNode>, 'description'>;

type SubscriptionFake = { readonly dispose: Mock<() => void> };

describe('FEATURE: followAffectedLabel', () => {
  let view: LabelView;
  let toggle: ScriptsToggleFake;
  let loads: SharedAffectedFake;
  let store: RootStore;
  let tree: PackagesTreeApi;
  let described: string | undefined;
  let descriptionWrites: Mock<(value: string | undefined) => void>;
  let treeSubscription: SubscriptionFake;
  let subscription: Disposable;

  const follow = (): void => {
    subscription = followAffectedLabel(view, { affected: toggle, affectedLoads: loads }, tree, store);
  };

  const treeListener = (): (() => void) => {
    const listener = vi.mocked(tree.onDidChangeTreeData).mock.calls[0]?.[0];

    if (listener === undefined) throw new Error('no tree listener');

    return () => {
      listener(undefined);
    };
  };

  beforeEach(() => {
    descriptionWrites = vi.fn();
    described = undefined;
    view = {};
    Object.defineProperty(view, 'description', {
      get: (): string | undefined => described,
      set: (value: string | undefined): void => {
        described = value;
        descriptionWrites(value);
      }
    });
    toggle = scriptsToggleMock();
    loads = sharedAffectedMock();
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    tree = packagesTreeApiMock();
    treeSubscription = { dispose: vi.fn() };
    vi.mocked(tree.onDidChangeTreeData).mockReturnValue(treeSubscription);
  });

  describe('GIVEN the toggle off and the root Absent', () => {
    beforeEach(() => {
      follow();
    });

    it('WHEN it starts THEN the description is empty', () => {
      expect(view.description).toBe('');
    });

    it('WHEN the tree redraws twice with the label unchanged THEN only the creation write reaches the view', () => {
      treeListener()();
      treeListener()();

      expect(descriptionWrites).toHaveBeenCalledExactlyOnceWith('');
    });
  });

  describe('GIVEN the toggle on and the root Loading without a result', () => {
    beforeEach(() => {
      toggle = scriptsToggleMock(true);
      vi.mocked(loads.status).mockReturnValue('loading');
      vi.mocked(loads.view).mockReturnValue(null);
      follow();
    });

    it('WHEN it starts THEN the first draw says checking', () => {
      expect(view.description).toBe('affected: checking…');
    });

    it('WHEN the query settles and the store emits THEN the description reads the task level', () => {
      vi.mocked(loads.status).mockReturnValue('loaded');
      vi.mocked(loads.view).mockReturnValue(AFFECTED_VIEW_STUB);
      loads.emit('/ws');

      expect(view.description).toBe('affected: task level');
    });

    it('WHEN the toggle is turned off THEN the description is empty', async () => {
      await toggle.set(false);

      expect(view.description).toBe('');
    });
  });

  describe('GIVEN the toggle off and the root Failed', () => {
    beforeEach(() => {
      vi.mocked(loads.status).mockReturnValue('failed');
      follow();
    });

    it('WHEN it starts THEN the description is empty', () => {
      expect(view.description).toBe('');
    });

    it('WHEN the toggle is turned on THEN the description says unavailable', async () => {
      await toggle.set(true);

      expect(view.description).toBe('affected: unavailable, see Output');
    });

    it('WHEN the toggle is on, the failed root leaves the window and the tree redraws THEN the description is read again', async () => {
      await toggle.set(true);
      store.set([], coordinatorMock);
      treeListener()();

      expect(view.description).toBe('');
    });

    it('WHEN it is disposed THEN no later toggle or store change writes the description and the tree subscription is released', async () => {
      subscription.dispose();
      await toggle.set(true);
      loads.emit('/ws');

      expect(view.description).toBe('');
      expect(treeSubscription.dispose).toHaveBeenCalledOnce();
    });
  });
});
