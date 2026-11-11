import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { AffectedTree } from './affected-tree.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import type { SharedAffectedFake } from '../test/common/shared-affected-fake.type.ts';
import { sharedAffectedMock } from '../test/mocks/shared-affected.mock.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';

const ROOT_B: RootFolder = { root: '/other', name: 'other' };

const NODE_WS: TreeNode = { kind: 'root', id: 'root:/ws', root: '/ws', key: '/ws', packageName: null };

const NODE_OTHER: TreeNode = { kind: 'root', id: 'root:/other', root: '/other', key: '/other', packageName: null };

describe('FEATURE: affected tree', () => {
  let shared: SharedAffectedFake;
  let fire: Mock<TreePorts['fire']>;
  let cache: Map<string, TreeNode>;
  let store: RootStore;
  let tree: AffectedTree;

  beforeEach(() => {
    shared = sharedAffectedMock();
    fire = vi.fn<TreePorts['fire']>();
    cache = new Map();
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    tree = new AffectedTree(store, cache, { affected: shared, fire });
  });

  it('WHEN rootShown runs THEN the store gets that root once', () => {
    tree.rootShown('/ws');

    expect(shared.rootShown).toHaveBeenCalledExactlyOnceWith('/ws');
  });

  it('WHEN a RootChange arrives THEN modelChanged gets that same object', () => {
    const change: RootChange = { root: '/ws', before: null, after: null, errorBefore: null, errorAfter: null };

    tree.modelChanged(change);

    expect(shared.modelChanged).toHaveBeenCalledExactlyOnceWith(change);
  });

  it('WHEN rootsChanged runs THEN rootsKept gets the set of the store roots', () => {
    tree.rootsChanged();

    expect(shared.rootsKept).toHaveBeenCalledExactlyOnceWith(new Set(['/ws']));
  });

  it('WHEN refreshAll runs THEN the store refreshes once', () => {
    tree.refreshAll();

    expect(shared.refreshAll).toHaveBeenCalledOnce();
  });

  it('WHEN dispose runs THEN the store is disposed once', () => {
    tree.dispose();

    expect(shared.dispose).toHaveBeenCalledOnce();
  });

  it('THEN reads exposes the shared view and status', () => {
    expect([tree.reads.view, tree.reads.status]).toStrictEqual([shared.view, shared.status]);
  });

  describe('GIVEN one root in the store', () => {
    it('WHEN the store changes /ws THEN fire gets undefined once, cached nodes or not', () => {
      shared.emit('/ws');

      expect(fire).toHaveBeenCalledExactlyOnceWith(undefined);
    });
  });

  describe('GIVEN two roots in the store and both root nodes cached', () => {
    beforeEach(() => {
      store.set([ROOT_FOLDER_STUB, ROOT_B], coordinatorMock);
      cache.set(NODE_WS.id, NODE_WS);
      cache.set(NODE_OTHER.id, NODE_OTHER);
    });

    it('WHEN the store changes /ws THEN fire gets exactly the /ws root node in one call', () => {
      shared.emit('/ws');

      expect(fire).toHaveBeenCalledExactlyOnceWith(NODE_WS);
    });

    it('WHEN the root node of /other is not cached THEN changing /other fires nothing', () => {
      cache.delete('root:/other');
      shared.emit('/other');

      expect(fire).not.toHaveBeenCalled();
    });
  });
});
