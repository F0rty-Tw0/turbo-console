import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PredictionTree } from './prediction-tree.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { TreeNode, TreePorts } from '../common/tree-node.type.ts';
import type { SharedPredictionFake } from '../test/common/shared-prediction-fake.type.ts';
import { sharedPredictionMock } from '../test/mocks/shared-prediction.mock.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { TASK_TREE_NODE_STUB, TREE_NODE_STUB, UMBRELLA_TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';
import { loadedWith, packageNamed } from '../test/utils/tree-model.spec.util.ts';

const NODE_A: TreeNode = TREE_NODE_STUB;

const NODE_B: TreeNode = { ...TREE_NODE_STUB, id: 'pkg:/ws\0b', key: 'b', packageName: 'b' };

const NODE_OTHER: TreeNode = { ...TREE_NODE_STUB, id: 'pkg:/other\0c', root: '/other', key: 'c', packageName: 'c' };

const TASK_NODE_OF_WS: TreeNode = TASK_TREE_NODE_STUB;

const NOT_PACKAGE_CASES: [string, TreeNode][] = [
  ['a task node', TASK_TREE_NODE_STUB],
  ['an umbrella node', UMBRELLA_TREE_NODE_STUB],
  ['a root node', { ...TREE_NODE_STUB, kind: 'root', packageName: null }],
  ['a folder node', { ...TREE_NODE_STUB, kind: 'dir', packageName: null }],
  ['a package node without a name', { ...TREE_NODE_STUB, packageName: null }]
];

const RUN_CASES: [string, string[][], Partial<RunEntry>][] = [
  ['still running', [], { state: 'running' }],
  ['ended, summary match pending', [], { state: 'passed', matching: true }],
  ['passed and matched', [['/ws']], { state: 'passed', matching: false }],
  ['failed and matched', [['/ws']], { state: 'failed', matching: false }],
  ['stopped', [['/ws']], { state: 'stopped', matching: false }]
];

describe('FEATURE: prediction tree', () => {
  let shared: SharedPredictionFake;
  let fire: Mock<TreePorts['fire']>;
  let cache: Map<string, TreeNode>;
  let store: RootStore;
  let tree: PredictionTree;

  beforeEach(() => {
    shared = sharedPredictionMock();
    fire = vi.fn<TreePorts['fire']>();
    cache = new Map();
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply('/ws', loadedWith([packageNamed('a')]));
    tree = new PredictionTree(store, cache, { prediction: shared, fire });
  });

  describe('GIVEN the children of a node are requested', () => {
    it('WHEN it is a package node THEN packageShown gets its root and package name once', () => {
      tree.childrenRequested(TREE_NODE_STUB);

      expect(shared.packageShown).toHaveBeenCalledExactlyOnceWith('/ws', 'a');
    });

    it('WHEN the same package node is requested twice THEN packageShown is called twice (the store, not the tree, ignores repeats)', () => {
      tree.childrenRequested(TREE_NODE_STUB);
      tree.childrenRequested(TREE_NODE_STUB);

      expect(shared.packageShown).toHaveBeenCalledTimes(2);
    });

    it.each(NOT_PACKAGE_CASES)('WHEN it is %s THEN packageShown is not called', (_name, node) => {
      tree.childrenRequested(node);

      expect(shared.packageShown).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a run changes', () => {
    it.each(RUN_CASES)('WHEN the run is %s THEN runEnded calls are %j', (_name, ended, patch) => {
      tree.runChanged({ ...RUN_ENTRY_STUB, ...patch });

      expect(vi.mocked(shared.runEnded).mock.calls).toStrictEqual(ended);
    });
  });

  it('WHEN a RootChange arrives THEN modelChanged gets that same object', () => {
    const model = loadedWith([packageNamed('a')]).model;
    const change: RootChange = { root: '/ws', before: model, after: model, errorBefore: null, errorAfter: null };

    tree.modelChanged(change);

    expect(shared.modelChanged).toHaveBeenCalledExactlyOnceWith(change);
  });

  it('WHEN rootsChanged runs THEN rootsKept gets the set of the store roots', () => {
    tree.rootsChanged();

    expect(shared.rootsKept).toHaveBeenCalledExactlyOnceWith(new Set(['/ws']));
  });

  it('WHEN refreshAll runs THEN it is forwarded once', () => {
    tree.refreshAll();

    expect(shared.refreshAll).toHaveBeenCalledOnce();
  });

  it('WHEN dispose runs THEN it is forwarded once', () => {
    tree.dispose();

    expect(shared.dispose).toHaveBeenCalledOnce();
  });

  it('THEN view is the shared view', () => {
    expect(tree.view).toBe(shared.view);
  });

  describe('GIVEN cached nodes: pkg a of /ws, pkg b of /ws, pkg c of /other, a task node of /ws', () => {
    beforeEach(() => {
      for (const node of [NODE_A, NODE_B, NODE_OTHER, TASK_NODE_OF_WS]) cache.set(node.id, node);
    });

    it('WHEN the store changes /ws THEN fire gets exactly the two /ws package nodes in one call', () => {
      shared.emit('/ws');

      expect(fire).toHaveBeenCalledExactlyOnceWith([NODE_A, NODE_B]);
    });

    it('WHEN the store changes a root with no cached package nodes THEN fire is not called', () => {
      shared.emit('/none');

      expect(fire).not.toHaveBeenCalled();
    });
  });
});
